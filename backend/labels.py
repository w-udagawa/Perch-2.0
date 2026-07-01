"""Turn Perch class ids into human-readable names.

Perch 2.0's species head is labelled with iNaturalist scientific names (from
the bundled ``labels.csv``), e.g. ``turdus_migratorius``. We format those into
canonical binomial form (``Turdus migratorius``). Japanese common names (和名)
are supplied for common Japanese taxa via :data:`backend.wamei.WAMEI`; species
outside that curated table simply show the scientific name. (The mock backend
also supplies its own English common names directly for a nicer demo.)
"""

from __future__ import annotations

from .wamei import WAMEI


def scientific_name(class_id: str) -> str:
    """Format a raw class id as a binomial scientific name."""
    parts = class_id.replace("_", " ").split()
    if not parts:
        return class_id
    parts[0] = parts[0].capitalize()  # Genus capitalised, epithets lower-case
    parts[1:] = [p.lower() for p in parts[1:]]
    return " ".join(parts)


def japanese_name(sci: str) -> str | None:
    """Return the 和名 for a binomial scientific name, or ``None`` if unlisted."""
    return WAMEI.get(sci)
