"""Base class for all data source modules."""
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class CompanyProfile:
    company_name: str
    industry: str
    voivodeship: str
    county: str = ""
    city: str = ""
    email: str = ""
    phone: str = ""
    website: str = ""
    source_type: str = ""
    source_detail: str = ""
    acquired_at: datetime = field(default_factory=datetime.now)


def validate_email(email: str) -> bool:
    if not email:
        return False
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    if not phone:
        return False
    digits = re.sub(r"\D", "", phone)
    return 7 <= len(digits) <= 15


class BaseSource:
    source_type: str = "base"
    source_detail: str = "Base Source"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        raise NotImplementedError
