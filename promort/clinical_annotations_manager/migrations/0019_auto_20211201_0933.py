# Generated by Django 3.1.13 on 2021-12-01 09:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinical_annotations_manager', '0018_auto_20211128_1525'),
    ]

    operations = [
        migrations.AddField(
            model_name='coreannotation',
            name='action_complete_time',
            field=models.DateTimeField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='focusregionannotation',
            name='action_complete_time',
            field=models.DateTimeField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='gleasonelement',
            name='action_complete_time',
            field=models.DateTimeField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='sliceannotation',
            name='action_complete_time',
            field=models.DateTimeField(default=None, null=True),
        ),
    ]
