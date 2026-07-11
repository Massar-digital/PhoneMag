from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0023_repairticket_repairstatuslog_repairpart_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='repairticket',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='repair_tickets',
                to='sales.customer',
            ),
        ),
    ]
