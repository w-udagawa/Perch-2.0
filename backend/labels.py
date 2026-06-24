"""Turn Perch class ids into human-readable names.

Perch 2.0's species head is labelled with iNaturalist scientific names (from
the bundled ``labels.csv``), e.g. ``turdus_migratorius``. We format those into
canonical binomial form (``Turdus migratorius``). English/Japanese common names
and eBird codes require an external taxonomy join and are out of scope for the
MVP (the mock backend supplies common names directly for a nicer demo).
"""

from __future__ import annotations


def scientific_name(class_id: str) -> str:
    """Format a raw class id as a binomial scientific name."""
    parts = class_id.replace("_", " ").split()
    if not parts:
        return class_id
    parts[0] = parts[0].capitalize()  # Genus capitalised, epithets lower-case
    parts[1:] = [p.lower() for p in parts[1:]]
    return " ".join(parts)
