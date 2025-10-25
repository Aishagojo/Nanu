from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("repository", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="resource",
            name="kind",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("video", "Video"),
                    ("image", "Image"),
                    ("pdf", "PDF"),
                    ("audio", "Audio"),
                    ("document", "Document"),
                    ("link", "Link"),
                ],
            ),
        ),
    ]
