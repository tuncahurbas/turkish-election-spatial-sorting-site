# Public Interactive Map

This folder is the first static public-facing version of the project. It is
designed to be served as a GitHub Pages site or previewed locally.

## Local Preview

Regenerate the compact public GeoJSON:

```bash
.venv/bin/python scripts/build_public_site_data.py
```

Serve the site:

```bash
.venv/bin/python -m http.server 8000 --directory site
```

Then open <http://localhost:8000>.

The preview currently loads Leaflet and OpenStreetMap tiles from public CDNs, so
the browser needs internet access. The district metric data itself is local in
`assets/district_cv.geojson`.

## Contents

- `index.html`: one-page interactive map.
- `assets/app.js`: Leaflet map logic, party selector, election slider, hover
  tooltips, and click details.
- `assets/styles.css`: page and map styling.
- `assets/district_cv.geojson`: compact derived district-level map data.
- `assets/spatial_sorting_neighborhoods.pdf`: paper PDF copy for the site.

The site ships only derived district-level metrics, not raw election archives or
large intermediate research outputs.

## Data Notes

District values are voter-weighted aggregations of within-mahalle dispersion
from the SECIM analysis outputs. District polygons come from geoBoundaries TUR
ADM2 gbOpen / OSM Boundaries and carry ODbL obligations. Gray districts in the
map are masked when the selected party is below 5% district mean support or the
party/list/geometry is unavailable.
