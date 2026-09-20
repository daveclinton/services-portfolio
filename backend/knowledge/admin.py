from django.contrib import admin
from .models import (
    Person, Company, Employment, Skill,
    Technology, Project, Evidence, KnowledgeChunk,
)

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ("name", "title", "location")
    search_fields = ("name",)

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Employment)
class EmploymentAdmin(admin.ModelAdmin):
    list_display = ("role", "company", "start_date", "end_date")
    list_filter = ("company",)
    autocomplete_fields = ("company", "person")

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Technology)
class TechnologyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "employment")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("skills", "technologies")

@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("title", "evidence_type", "confidence", "project", "employment")
    list_filter = ("confidence", "evidence_type")

@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("source_type", "source_path", "project_slug", "company_slug")
    list_filter = ("source_type",)
    search_fields = ("content",)
