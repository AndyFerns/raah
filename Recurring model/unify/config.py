import numpy as np

# Taxonomy mapping for Domain and Subdomain (Examples to be extended)
DOMAIN_MAP = {
    "water supply": "Water Management",
    "water_supply": "Water Management",
    "water leakage": "Water Management",
    "drainage": "Water Management",
    "pothole": "Urban Infrastructure",
    "roads": "Urban Infrastructure",
    "transport": "Urban Infrastructure",
    "street light": "Urban Infrastructure",
    "street_lighting": "Urban Infrastructure",
    "solid waste": "Sanitation",
    "garbage": "Sanitation",
    "sanitation": "Sanitation",
    "toilet": "Sanitation",
    "health": "Healthcare",
    "medical": "Healthcare",
    "education": "Education",
    "school": "Education",
    "electricity": "Energy",
    "power": "Energy",
    "environment": "Environment",
    "pollution": "Environment",
    "tree": "Environment",
    "encroachment": "Public Order / Governance",
    "illegal construction": "Public Order / Governance",
    "stray animal": "Public Health / Safety",
    "agriculture": "Agriculture",
    "farming": "Agriculture",
    "accessibility": "Accessibility",
    "disaster": "Disaster Management",
    "rural": "Rural Livelihoods",
    "administration": "Public Administration",
    "certificates": "Public Administration",
    "welfare": "Welfare"
}

# Similarity Thresholds
SEM_SIM_THRESH = 0.80
DIST_THRESH_KM = 10.0

# Monsoon Months (June to September)
MONSOON_MONTHS = [6, 7, 8, 9]

# Severity and Urgency Ranges (min, max) -> map to median for unified score
SEVERITY_RANGES = {
    'low': (1, 3),
    'medium': (4, 6),
    'high': (7, 8),
    'critical': (9, 10),
    'service_delay': (4, 6),       # CivicDex mapping
    'service_failure': (7, 8),     # CivicDex mapping
    'public_hazard': (9, 10)       # CivicDex mapping
}

URGENCY_RANGES = {
    'low': (1, 3),
    'medium': (4, 6),
    'high': (7, 9),
    'critical': (10, 10)
}

def map_score(val, ranges_dict):
    """Maps a string category to the median of its defined numeric range."""
    if not isinstance(val, str):
        return np.nan
    val_lower = val.lower().strip()
    if val_lower in ranges_dict:
        low, high = ranges_dict[val_lower]
        return (low + high) / 2.0
    return np.nan

def normalize_domain(category):
    """Simple keyword-based normalization for domain."""
    if not isinstance(category, str):
        return "Other"
    cat_lower = category.lower()
    for key, domain in DOMAIN_MAP.items():
        if key in cat_lower:
            return domain
    return category.title()

def normalize_subdomain(category):
    """Use the raw category as subdomain if it's fine-grained."""
    if not isinstance(category, str):
        return "Other"
    return category.strip().title()
