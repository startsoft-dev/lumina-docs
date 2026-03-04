---
sidebar_position: 8
title: Multi-Tenancy
---

# Multi-Tenancy

Lumina supports organization-based multi-tenancy with two strategies: route prefix and subdomain.

## Configuration

```python title="settings.py"
LUMINA = {
    'MULTI_TENANT': {
        'ENABLED': True,
        'USE_SUBDOMAIN': False,           # True = subdomain, False = route prefix
        'ORGANIZATION_MODEL': 'myapp.Organization',
        'ORGANIZATION_IDENTIFIER_FIELD': 'slug',  # or 'id', 'uuid'
    },
}
```

## Route Prefix (Default)

With `USE_SUBDOMAIN: False`, organizations are identified via URL:

```
GET /api/acme/posts          # Posts for "acme" organization
GET /api/acme/posts/1        # Single post in "acme"
POST /api/acme/posts         # Create post in "acme"
```

### Middleware Setup

```python title="settings.py"
MIDDLEWARE = [
    # ...
    'lumina.middleware.organization.ResolveOrganizationFromRouteMiddleware',
]
```

### URL Configuration

```python title="urls.py"
from lumina.urls import get_urls

urlpatterns = [
    path('api/', include((get_urls(), 'lumina'))),
]
```

Lumina automatically generates URLs with `<str:organization>/` prefix.

## Subdomain Strategy

With `USE_SUBDOMAIN: True`, organizations are identified via subdomain:

```
GET https://acme.example.com/api/posts
```

### Middleware Setup

```python title="settings.py"
MIDDLEWARE = [
    # ...
    'lumina.middleware.organization.ResolveOrganizationFromSubdomainMiddleware',
]
```

Subdomains `www`, `app`, `api`, and `localhost` are automatically skipped.

## How It Works

1. Middleware resolves the organization from the route parameter or subdomain
2. Organization is attached to the request as `request.lumina_organization`
3. Lumina automatically scopes all queries to the organization
4. New records have `organization_id` auto-set

## Scoping Models

Add `organization_id` to your model:

```python title="models.py"
from lumina.mixins import BelongsToOrganizationMixin

class Post(BelongsToOrganizationMixin, models.Model):
    title = models.CharField(max_length=255)
    organization_id = models.PositiveIntegerField()
```

All queries are automatically filtered by `organization_id` when an organization is in context.

## Organization Model

```python title="models.py"
class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    domain = models.CharField(max_length=255, blank=True)  # For subdomain strategy

    class Meta:
        app_label = 'myapp'
```

## Access Control

| Scenario               | Response   |
|------------------------|------------|
| Organization not found | `404`      |
| User not in org        | `404`      |
| No authentication      | `401`      |
| Public endpoint        | `200` (no org check) |

:::warning
When multi-tenancy is enabled, users can only access organizations they belong to. Requests to other organizations return 404.
:::
