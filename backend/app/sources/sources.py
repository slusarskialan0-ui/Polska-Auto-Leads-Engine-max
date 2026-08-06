"""Simulated data sources for Polish businesses.

Each source module generates realistic synthetic company profiles per voivodeship + industry.
In production these would be replaced by real scrapers/API clients.
"""
import random
import hashlib
from faker import Faker
from .base import BaseSource, CompanyProfile
from ..data.geography import VOIVODESHIP_CITIES

fake = Faker("pl_PL")
random.seed(42)


def _seed(voivodeship: str, industry: str, source: str, idx: int) -> int:
    key = f"{voivodeship}-{industry}-{source}-{idx}"
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)


def _generate_profiles(
    voivodeship: str,
    industries: list[str],
    source_type: str,
    source_detail: str,
    count_per_industry: int = 5,
) -> list[CompanyProfile]:
    profiles = []
    cities = VOIVODESHIP_CITIES.get(voivodeship, [voivodeship.capitalize()])
    for industry in industries:
        for i in range(count_per_industry):
            random.seed(_seed(voivodeship, industry, source_type, i))
            Faker.seed(_seed(voivodeship, industry, source_type, i))
            has_email = random.random() > 0.3
            has_phone = random.random() > 0.2
            has_web = random.random() > 0.5
            city = random.choice(cities)
            company = fake.company()
            profiles.append(
                CompanyProfile(
                    company_name=company,
                    industry=industry,
                    voivodeship=voivodeship,
                    city=city,
                    county=f"powiat {city.lower()}",
                    email=fake.company_email() if has_email else "",
                    phone=fake.phone_number() if has_phone else "",
                    website=f"https://www.{fake.domain_name()}" if has_web else "",
                    source_type=source_type,
                    source_detail=source_detail,
                )
            )
    return profiles


class CatalogSource(BaseSource):
    source_type = "katalog"
    source_detail = "Katalog Firm Polska"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        return _generate_profiles(voivodeship, industries, self.source_type, self.source_detail, count_per_industry=8)


class MapSource(BaseSource):
    source_type = "mapa"
    source_detail = "Lokalne Wyszukiwarki i Mapy"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        return _generate_profiles(voivodeship, industries, self.source_type, self.source_detail, count_per_industry=7)


class RegistrySource(BaseSource):
    source_type = "rejestr"
    source_detail = "Rejestry Publiczne (CEIDG/KRS)"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        return _generate_profiles(voivodeship, industries, self.source_type, self.source_detail, count_per_industry=6)


class SocialSource(BaseSource):
    source_type = "social"
    source_detail = "Social Media Firmowe"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        return _generate_profiles(voivodeship, industries, self.source_type, self.source_detail, count_per_industry=4)


class ListingsSource(BaseSource):
    source_type = "ogloszenia"
    source_detail = "Portale Ogłoszeniowe"

    def fetch(self, voivodeship: str, industries: list[str]) -> list[CompanyProfile]:
        return _generate_profiles(voivodeship, industries, self.source_type, self.source_detail, count_per_industry=5)


ALL_SOURCES = [
    CatalogSource(),
    MapSource(),
    RegistrySource(),
    SocialSource(),
    ListingsSource(),
]
