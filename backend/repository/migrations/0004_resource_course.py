from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0005_backfill_course_department'),
        ('repository', '0003_resourcetag_alter_resource_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='resource',
            name='course',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='resources',
                to='learning.course',
            ),
        ),
    ]
