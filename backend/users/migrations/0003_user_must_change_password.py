from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_parent_student_links"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="must_change_password",
            field=models.BooleanField(default=False),
        ),
    ]
