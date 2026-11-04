"""Add the natural keys the Phase 2 ingestion pipeline upserts on.

* ``Person.slug``  — stable identifier for the profile (nullable + unique so
  Person rows created elsewhere, e.g. the API tests, stay valid).
* ``Evidence.slug`` — matches ``knowledge/evidence/<evidence-slug>.md``.

Existing rows are backfilled from ``name`` / ``claim`` before the unique
constraint on ``Evidence.slug`` is applied.
"""

from django.db import migrations, models
from django.utils.text import slugify


def backfill_slugs(apps, schema_editor):
    Person = apps.get_model("knowledge", "Person")
    Evidence = apps.get_model("knowledge", "Evidence")
    _backfill(Person, "name")
    _backfill(Evidence, "claim")


def _backfill(model, source_field):
    for obj in model.objects.all():
        base = slugify(getattr(obj, source_field))[:40] or model.__name__.lower()
        slug = base
        suffix = 2
        while model.objects.filter(slug=slug).exclude(pk=obj.pk).exists():
            slug = f"{base}-{suffix}"
            suffix += 1
        obj.slug = slug
        obj.save(update_fields=["slug"])


class Migration(migrations.Migration):

    dependencies = [
        ("knowledge", "0002_knowledgechunk"),
    ]

    operations = [
        migrations.AddField(
            model_name="person",
            name="slug",
            field=models.SlugField(blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="evidence",
            name="slug",
            # Added without an index on purpose: the following AlterField turns
            # it unique, and PostgreSQL would otherwise be asked to create the
            # varchar_pattern_ops "like" index twice.
            field=models.SlugField(null=True, db_index=False),
        ),
        migrations.RunPython(backfill_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="evidence",
            name="slug",
            field=models.SlugField(unique=True),
        ),
    ]
