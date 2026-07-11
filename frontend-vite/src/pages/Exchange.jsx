import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { Input, Select, Textarea } from '../components/forms/FormFields';
import { phonesAPI, customersAPI, exchangeAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';
import PrintableExchangeReceipt from '../components/PrintableExchangeReceipt';
import { formatDRFError } from '../utils/errorUtils';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ---------- helpers ----------
const fmt = (n) =>
  parseFloat(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA';

const BRAND_OPTIONS = [
  { value: '', label: 'Sélectionner une marque' },
  { value: 'Apple', label: 'Apple' },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'Xiaomi', label: 'Xiaomi' },
  { value: 'OnePlus', label: 'OnePlus' },
  { value: 'Google', label: 'Google' },
  { value: 'Huawei', label: 'Huawei' },
  { value: 'Other', label: 'Autre marque' },
];

const STORAGE_OPTIONS = [
  { value: '', label: 'Sélectionner le stockage' },
  { value: '8GB', label: '8 Go' },
  { value: '16GB', label: '16 Go' },
  { value: '32GB', label: '32 Go' },
  { value: '64GB', label: '64 Go' },
  { value: '128GB', label: '128 Go' },
  { value: '256GB', label: '256 Go' },
  { value: '512GB', label: '512 Go' },
  { value: '1TB', label: '1 To' },
];

const RAM_OPTIONS = [
  { value: '', label: 'Sélectionner la RAM' },
  { value: '2GB', label: '2 Go' },
  { value: '3GB', label: '3 Go' },
  { value: '4GB', label: '4 Go' },
  { value: '6GB', label: '6 Go' },
  { value: '8GB', label: '8 Go' },
  { value: '12GB', label: '12 Go' },
  { value: '16GB', label: '16 Go' },
];

const COLOR_OPTIONS = [
  { value: '', label: 'Sélectionner une couleur' },
  { value: 'Noir', label: 'Noir' },
  { value: 'Blanc', label: 'Blanc' },
  { value: 'Argent', label: 'Argent' },
  { value: 'Or', label: 'Or' },
  { value: 'Gris Sidéral', label: 'Gris Sidéral' },
  { value: 'Bleu', label: 'Bleu' },
  { value: 'Rouge', label: 'Rouge' },
  { value: 'Vert', label: 'Vert' },
  { value: 'Rose', label: 'Rose' },
  { value: 'Violet', label: 'Violet' },
  { value: 'Jaune', label: 'Jaune' },
  { value: 'Minuit', label: 'Minuit' },
  { value: 'Lumière Stellaire', label: 'Lumière Stellaire' },
  { value: 'Titane Naturel', label: 'Titane Naturel' },
  { value: 'Autre', label: 'Autre couleur' },
];

const CONDITION_CHOICES = [
  { value: 'New', label: 'Neuf' },
  { value: 'Refurbished', label: 'Reconditionné' },
  { value: 'Used', label: 'Utilisé' },
  { value: 'Defective', label: 'Défectueux' },
];

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Espèces' },
  { value: 'Card', label: 'Carte' },
  { value: 'Split', label: 'Split' },
  { value: 'Check', label: 'Chèque' },
  { value: 'Mobile Wallet', label: 'Mobile Wallet' },
  { value: 'Other', label: 'Autre' },
];

const emptyForm = {
  // Client
  customer_mode: 'none', // 'none' | 'existing' | 'new'
  customer_id: '',
  customer_name: '',
  customer_phone_input: '',
  // New phone
  new_phone_id: '',
  new_phone_price: '',
  // Old phone (trade-in)
  old_brand: '',
  old_brand_custom: '',
  old_model: '',
  old_imei: '',
  old_color: '',
  old_custom_color: '',
  old_storage: '',
  old_ram: '',
  old_condition: 'Used',
  old_battery_percentage: '',
  old_trade_in_value: '',
  old_resale_price: '',
  old_notes: '',
  // Payment
  payment_method: 'Cash',
};

// ===========================================================================
export default function Exchange() {
  const { data: shopSettings } = useShopSettings();

  // Data
  const [exchanges, setExchanges] = useState([]);
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');

  // Selected exchange for view/print
  const [viewExchange, setViewExchange] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  // Print ref
  const receiptRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: viewExchange ? `Echange_${viewExchange.sale_invoice || viewExchange.id}` : 'Echange',
    print: async (printIframe) => {
      if (window.electron?.print) {
        const html = printIframe.contentDocument.documentElement.outerHTML;
        window.electron.print({ html, preview: true });
      } else {
        printIframe.contentWindow.print();
      }
    },
  });

  // ---------- load data ----------
  const loadExchanges = useCallback(async () => {
    try {
      setLoading(true);
      const [exchRes, statsRes] = await Promise.all([
        exchangeAPI.getAll(),
        exchangeAPI.getStats(),
      ]);
      setExchanges(exchRes.data.results || exchRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      window.showToast?.('Impossible de charger les échanges', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExchanges();
  }, [loadExchanges]);

  const loadPhones = useCallback(async () => {
    try {
      const res = await phonesAPI.getAll({ page_size: 1000, product_type: 'Phone' });
      setPhones(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await customersAPI.getAll({ page_size: 1000 });
      setCustomers(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleOpenModal = () => {
    setForm(emptyForm);
    setError(null);
    setPhoneSearch('');
    loadPhones();
    loadCustomers();
    setIsModalOpen(true);
  };

  // ---------- computed: price difference ----------
  const newPhonePrice = parseFloat(form.new_phone_price) || 0;
  const tradeInValue = parseFloat(form.old_trade_in_value) || 0;
  const selectedPhone = phones.find((p) => String(p.id) === String(form.new_phone_id));
  const difference = Math.max(0, newPhonePrice - tradeInValue);

  // ---------- form helpers ----------
  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePhoneSelect = (phone) => {
    setForm((prev) => ({
      ...prev,
      new_phone_id: String(phone.id),
      new_phone_price: String(phone.price),
    }));
    setPhoneSearch('');
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.new_phone_id) {
      setError('Veuillez sélectionner le nouveau téléphone.');
      return;
    }
    const resolvedBrand = form.old_brand === 'Other' ? form.old_brand_custom : form.old_brand;
    if (!resolvedBrand || !form.old_model) {
      setError("Veuillez renseigner la marque et le modèle de l'ancien téléphone.");
      return;
    }
    if (!form.old_trade_in_value || parseFloat(form.old_trade_in_value) <= 0) {
      setError('Veuillez entrer la valeur de reprise.');
      return;
    }

    if (parseFloat(form.old_trade_in_value) > parseFloat(form.new_phone_price)) {
      setError("La valeur de reprise ne peut pas être supérieure au prix du nouveau téléphone. Le magasin ne rend pas d'argent.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        items: [
          {
            phone: parseInt(form.new_phone_id),
            quantity: 1,
            unit_price: parseFloat(form.new_phone_price),
            discount_applied: 0,
          },
        ],
        total_price: parseFloat(form.new_phone_price), // backend recalculates after trade-in
        amount_paid: difference,
        payment_status: 'PAID',
        payment_method: form.payment_method,
        // Customer
        customer: form.customer_mode === 'existing' && form.customer_id ? parseInt(form.customer_id) : null,
        customer_name:
          form.customer_mode === 'existing'
            ? customers.find((c) => String(c.id) === form.customer_id)?.name || ''
            : form.customer_mode === 'new'
            ? form.customer_name
            : 'Client de passage',
        customer_phone:
          form.customer_mode === 'new' ? form.customer_phone_input : '',
        // Trade-in
        trade_in: {
          brand: form.old_brand === 'Other'
            ? (form.old_brand_custom || 'Other')
            : form.old_brand,
          model: form.old_model,
          imei: form.old_imei || null,
          color: form.old_color === 'Autre'
            ? (form.old_custom_color || 'Non spécifié')
            : (form.old_color || 'Non spécifié'),
          storage: form.old_storage || null,
          ram: form.old_ram || null,
          condition: form.old_condition,
          battery_percentage: form.old_battery_percentage ? parseInt(form.old_battery_percentage) : null,
          trade_in_value: parseFloat(form.old_trade_in_value),
          resale_price: form.old_resale_price ? parseFloat(form.old_resale_price) : null,
          notes: form.old_notes || '',
        },
      };

      const res = await exchangeAPI.create(payload);
      window.showToast?.('Échange enregistré avec succès', 'success');
      setIsModalOpen(false);

      // Show receipt
      setViewExchange(res.data);
      setShowReceiptModal(true);

      loadExchanges();
    } catch (err) {
      console.error(err);
      setError(formatDRFError(err.response?.data) || "Erreur lors de l'enregistrement de l'échange.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- search filter ----------
  const filteredPhones = phones.filter((p) => {
    if (!phoneSearch) return true;
    const q = phoneSearch.toLowerCase();
    return (
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.IMEI?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  });

  const filteredExchanges = exchanges.filter((ex) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ex.customer_name?.toLowerCase().includes(q) ||
      ex.brand?.toLowerCase().includes(q) ||
      ex.model?.toLowerCase().includes(q) ||
      ex.sale_invoice?.toLowerCase().includes(q) ||
      ex.new_phone_name?.toLowerCase().includes(q)
    );
  });

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <PageHeader
        title="Service d'Échange"
        subtitle="Reprise d'ancien téléphone + vente d'un nouveau"
        actions={
          <Button variant="primary" onClick={handleOpenModal} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Nouvel échange
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-indigo-600">{stats.total_exchanges}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Échanges totaux</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-emerald-600">{fmt(stats.total_trade_in_value)}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Valeur totale reprise</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-amber-600">{fmt(stats.average_trade_in_value)}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Valeur moyenne reprise</p>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par client, téléphone, facture…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
      </div>

      {/* Exchange list */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filteredExchanges.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">
          <ArrowsRightLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">Aucun échange trouvé</p>
          <p className="text-xs mt-1">Créez le premier échange en cliquant sur « Nouvel échange ».</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">N° Vente</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Ancien tél. (repris)</th>
                <th className="px-4 py-3 text-left">Nouveau tél. (vendu)</th>
                <th className="px-4 py-3 text-right">Valeur reprise</th>
                <th className="px-4 py-3 text-right">Montant payé</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExchanges.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {ex.sale_invoice || `EXC-${ex.id}`}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{ex.customer_name || '–'}</p>
                    {ex.customer_phone_number && (
                      <p className="text-xs text-slate-400">{ex.customer_phone_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-red-700">
                      {ex.brand} {ex.model}
                    </p>
                    <p className="text-xs text-slate-400">
                      {ex.condition}{ex.imei ? ` · IMEI: ${ex.imei}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-emerald-700">{ex.new_phone_name || '–'}</p>
                    {ex.new_phone_price && (
                      <p className="text-xs text-slate-400">{fmt(ex.new_phone_price)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {fmt(ex.trade_in_value)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {fmt(ex.amount_paid_by_client)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {ex.sale_date
                      ? new Date(ex.sale_date).toLocaleDateString('fr-FR')
                      : new Date(ex.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      title="Voir le reçu"
                      onClick={() => { setViewExchange(ex); setShowReceiptModal(true); }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== New Exchange Modal ==================== */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        header="Nouvel échange"
        size="xl"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          {/* ---- Section 1: Client ---- */}
          <section>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">1</span>
              Client
            </h3>
            <div className="flex gap-2 mb-3">
              {['none', 'existing', 'new'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, customer_mode: mode, customer_id: '', customer_name: '', customer_phone_input: '' }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    form.customer_mode === mode
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'none' ? 'De passage' : mode === 'existing' ? 'Client existant' : 'Nouveau client'}
                </button>
              ))}
            </div>

            {form.customer_mode === 'existing' && (
              <Select
                label="Sélectionner le client"
                value={form.customer_id}
                onChange={set('customer_id')}
                options={[
                  { value: '', label: '– Choisir –' },
                  ...customers.map((c) => ({
                    value: String(c.id),
                    label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
                  }))
                ]}
              />
            )}

            {form.customer_mode === 'new' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nom du client"
                  value={form.customer_name}
                  onChange={set('customer_name')}
                  required
                />
                <Input
                  label="Téléphone"
                  value={form.customer_phone_input}
                  onChange={set('customer_phone_input')}
                  placeholder="05 / 06 / 07…"
                />
              </div>
            )}
          </section>

          {/* ---- Section 2: New Phone ---- */}
          <section>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">2</span>
              Nouveau téléphone (vendu)
            </h3>

            {/* Selected phone badge */}
            {selectedPhone && (
              <div className="mb-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="font-black text-emerald-800">
                    {selectedPhone.brand} {selectedPhone.model}
                    {selectedPhone.storage ? ` – ${selectedPhone.storage}` : ''}
                  </p>
                  <p className="text-xs text-emerald-600">
                    Prix : {fmt(selectedPhone.price)}
                    {selectedPhone.IMEI ? ` · IMEI: ${selectedPhone.IMEI}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, new_phone_id: '', new_phone_price: '' }))}
                  className="text-xs text-red-500 hover:underline"
                >
                  Changer
                </button>
              </div>
            )}

            {!selectedPhone && (
              <>
                <div className="relative mb-2">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    placeholder="Rechercher un téléphone par nom, IMEI, code-barres…"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                  {filteredPhones
                    .filter((p) => p.product_type === 'Phone')
                    .map((p) => {
                      const stock = p.inventory?.stock_quantity ?? p.stock_quantity ?? '?';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={stock === 0}
                          onClick={() => handlePhoneSelect(p)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <div>
                            <span className="font-semibold">
                              {p.brand} {p.model}
                              {p.storage ? ` – ${p.storage}` : ''}
                              {p.color ? ` (${p.color})` : ''}
                            </span>
                            {p.IMEI && <span className="ml-2 text-xs text-slate-400">IMEI: {p.IMEI}</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-slate-400">Stock: {stock}</span>
                            <span className="font-bold text-emerald-700">{fmt(p.price)}</span>
                          </div>
                        </button>
                      );
                    })}
                  {filteredPhones.filter((p) => p.product_type === 'Phone').length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">Aucun téléphone trouvé</p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ---- Section 3: Old Phone (Trade-in) ---- */}
          <section>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="bg-red-100 text-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">3</span>
              Ancien téléphone (repris)
            </h3>
            <div className="grid grid-cols-2 gap-3">

              {/* Marque */}
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <Select
                  label="Marque *"
                  value={form.old_brand}
                  onChange={set('old_brand')}
                  options={BRAND_OPTIONS}
                  required
                />
                {form.old_brand === 'Other' && (
                  <Input
                    label="Préciser la marque *"
                    value={form.old_brand_custom || ''}
                    onChange={set('old_brand_custom')}
                    placeholder="ex: Oppo, Vivo…"
                    required
                  />
                )}
              </div>

              {/* Modèle */}
              <div className="col-span-2">
                <Input label="Modèle *" value={form.old_model} onChange={set('old_model')} required placeholder="ex: Galaxy S21" />
              </div>

              {/* Stockage & RAM */}
              <Select
                label="Stockage"
                value={form.old_storage}
                onChange={set('old_storage')}
                options={STORAGE_OPTIONS}
              />
              {form.old_brand?.toLowerCase() !== 'apple' && (
                <Select
                  label="RAM"
                  value={form.old_ram}
                  onChange={set('old_ram')}
                  options={RAM_OPTIONS}
                />
              )}

              {/* Couleur */}
              <Select
                label="Couleur"
                value={form.old_color}
                onChange={set('old_color')}
                options={COLOR_OPTIONS}
              />
              {form.old_color === 'Autre' && (
                <Input
                  label="Préciser la couleur"
                  value={form.old_custom_color}
                  onChange={set('old_custom_color')}
                  placeholder="ex: Rose Gold"
                />
              )}

              {/* IMEI & État */}
              <Input label="IMEI / N° de série" value={form.old_imei} onChange={set('old_imei')} placeholder="15 chiffres" maxLength={15} />
              <Select
                label="État"
                value={form.old_condition}
                onChange={set('old_condition')}
                options={CONDITION_CHOICES}
              />

              {/* Batterie (Apple / Samsung / OnePlus) */}
              {['apple', 'samsung', 'oneplus'].includes(form.old_brand?.toLowerCase()) && (
                <div className="col-span-2">
                  <Input
                    label="État de la batterie (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={form.old_battery_percentage}
                    onChange={set('old_battery_percentage')}
                    placeholder="ex: 87"
                  />
                </div>
              )}

              {/* Prix */}
              <Input
                label="Valeur de reprise / Prix d'achat (DA) *"
                type="number"
                min="0"
                value={form.old_trade_in_value}
                onChange={set('old_trade_in_value')}
                required
                placeholder="Ex: 20000"
              />
              <Input
                label="Prix de revente (DA)"
                type="number"
                min="0"
                value={form.old_resale_price}
                onChange={set('old_resale_price')}
                placeholder="Laissez vide = auto +20%"
              />

              {/* Notes */}
              <div className="col-span-2">
                <Textarea label="Remarques / état détaillé" value={form.old_notes} onChange={set('old_notes')} rows={2} placeholder="Rayures, batterie faible, écran fissuré…" />
              </div>
            </div>
          </section>

          {/* ---- Section 4: Payment ---- */}
          <section>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="bg-amber-100 text-amber-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">4</span>
              Paiement
            </h3>
            <Select
              label="Mode de paiement"
              value={form.payment_method}
              onChange={set('payment_method')}
              options={PAYMENT_METHODS}
            />
          </section>

          {/* ---- Price Summary ---- */}
          {(newPhonePrice > 0 || tradeInValue > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wide mb-3">Récapitulatif</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Prix nouveau téléphone</span>
                  <span className="font-semibold">{fmt(newPhonePrice)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>– Valeur de reprise (ancien tél.)</span>
                  <span className="font-semibold">– {fmt(tradeInValue)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-black text-base">
                  <span className="text-slate-800">Le client paie</span>
                  <span className="text-emerald-700">{fmt(difference)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ---- Actions ---- */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Confirmer l\'échange'}
            </Button>
          </div>
        </form>
        </div>
      </Modal>

      {/* ==================== Receipt Modal ==================== */}
      <Modal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        header="Bon d'échange"
        size="4xl"
      >
        <div className="p-6">
          <div className="mb-4 flex justify-end">
            <Button variant="primary" onClick={handlePrint} className="flex items-center gap-2">
              <PrinterIcon className="w-4 h-4" />
              Imprimer
            </Button>
          </div>
          <PrintableExchangeReceipt ref={receiptRef} exchange={viewExchange} shopSettings={shopSettings} />
        </div>
      </Modal>
    </div>
  );
}
