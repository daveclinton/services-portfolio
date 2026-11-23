from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0008_aiconversation_alerted_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aiconversationturn",
            name="status",
            field=models.CharField(
                choices=[
                    ("completed", "Completed"),
                    ("no_evidence", "No evidence"),
                    ("degraded", "Evidence only"),
                    ("error", "Error"),
                ],
                max_length=20,
            ),
        ),
    ]
