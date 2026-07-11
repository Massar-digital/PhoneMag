from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('phones', '0005_phone_product_type_alter_phone_imei_and_more'),
    ]
    operations = [
        migrations.AddField(
            model_name='phone',
            name='battery_cycle',
            field=models.IntegerField(blank=True, null=True, help_text='Battery cycle count (for laptops)'),
        ),
        migrations.AddField(
            model_name='phone',
            name='screen_size',
            field=models.CharField(blank=True, max_length=20, null=True, help_text="Screen size in inches (e.g., '13.3')"),
        ),
        # No schema change needed for adding Laptop choice as it's a CharField with choices
    ]
