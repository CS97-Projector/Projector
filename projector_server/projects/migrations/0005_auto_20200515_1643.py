# Generated by Django 3.0.6 on 2020-05-15 16:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0004_auto_20200509_1352'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='logo',
            field=models.ImageField(blank=True, upload_to='logos'),
        ),
    ]