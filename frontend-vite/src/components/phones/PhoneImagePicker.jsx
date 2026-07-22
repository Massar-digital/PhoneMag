import { useState, useEffect, useRef } from 'react';
import { phonesAPI } from '../../services/api';

const states = { IDLE: 'idle', LOADING: 'loading', RESULTS: 'results', EMPTY: 'empty', ERROR: 'error' };

export const PhoneImagePicker = ({ watch, setValue, imageUrl }) => {
  const brand = watch('brand');
  const model = watch('model');
  const [fetchState, setFetchState] = useState(states.IDLE);
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(imageUrl || null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Clear results when brand/model changes to avoid stale previews
  useEffect(() => {
    if (fetchState !== states.IDLE) {
      setFetchState(states.IDLE);
      setImages([]);
      setSelected(null);
    }
  }, [brand, model]);

  const canFetch = brand?.trim() && model?.trim();

  const handleFetch = async () => {
    if (!canFetch) return;
    setFetchState(states.LOADING);
    try {
      const res = await phonesAPI.fetchImage({ brand, model });
      if (!mountedRef.current) return;
      const urls = res.data.images || [];
      if (urls.length === 0) {
        setFetchState(states.EMPTY);
        window.showToast?.('Aucune image trouvée, ajoutez manuellement', 'warning');
      } else {
        setImages(urls);
        setFetchState(states.RESULTS);
      }
    } catch {
      if (!mountedRef.current) return;
      setFetchState(states.ERROR);
      window.showToast?.('Erreur lors de la recherche d\'image', 'error');
    }
  };

  const handleSelect = (url) => {
    setSelected(url);
    setValue('image_url', url, { shouldDirty: true });
  };

  return (
    <div className="space-y-3 mt-2">
      <button
        type="button"
        onClick={handleFetch}
        disabled={!canFetch || fetchState === states.LOADING}
        className={`
          inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            !canFetch
              ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
          }
        `}
      >
        {fetchState === states.LOADING ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Recherche...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Chercher une image
          </>
        )}
      </button>

      {fetchState === states.RESULTS && images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(url)}
              className={`
                w-20 h-20 rounded-lg overflow-hidden flex-shrink-0
                transition-all duration-150
                ${selected === url
                  ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-105'
                  : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300 dark:hover:ring-blue-600'
                }
              `}
            >
              <img
                src={url}
                alt={`Option ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
