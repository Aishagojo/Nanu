from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_department'),
        ('users', '0006_userprovisionrequest_temporary_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='staff_members',
                to='core.department',
            ),
        ),
    ]
