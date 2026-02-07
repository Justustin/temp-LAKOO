#!/usr/bin/env python3
"""
LAKOO Bazaar WhatsApp Extractor

Extracts Indonesian phone numbers from bazaar event pages, Instagram bios,
or any text source — then formats them as WhatsApp contact links for
the bazaar sponsorship outreach team.

Usage:
  # Extract from a URL (bazaar listing page)
  python bazaar_whatsapp_extractor.py --url https://example.com/bazaar-event

  # Extract from pasted text (e.g. copied from IG bios, flyers)
  python bazaar_whatsapp_extractor.py --text "Hub kami 0812-3456-7890 atau WA 628199887766"

  # Extract from a file containing brand info
  python bazaar_whatsapp_extractor.py --file brands.txt

  # Export results to CSV
  python bazaar_whatsapp_extractor.py --url https://example.com --output results.csv
"""

import argparse
import csv
import re
import sys
from datetime import datetime
from urllib.request import urlopen, Request
from html.parser import HTMLParser


# --- Phone number extraction ---

SEP = r'[ .\-]'  # separator: space, dot, or dash (NOT newline)

INDO_PHONE_PATTERNS = [
    # +62xxx, 62xxx (with optional dashes/dots/spaces)
    rf'(?:\+?62){SEP}?(?:\d{SEP}?){{8,12}}\d(?!\d)',
    # 08xx (local format, with optional dashes/dots/spaces)
    rf'0 ?8(?:{SEP}?\d){{8,11}}(?!\d)',
]

WA_LINK_PATTERN = r'wa\.me/(\+?\d[\d\-]{8,15}\d)(?!\d)'


def clean_number(raw: str) -> str:
    """Strip separators and normalize to +62 international format."""
    digits = re.sub(r'\D', '', raw)
    if digits.startswith('62'):
        digits = digits
    elif digits.startswith('0'):
        digits = '62' + digits[1:]
    # drop numbers that are too short or too long
    if len(digits) < 10 or len(digits) > 15:
        return ''
    return '+' + digits


def extract_numbers(text: str) -> list[dict]:
    """Return deduplicated list of {raw, formatted, wa_link} dicts."""
    seen = set()
    results = []

    # check wa.me links first
    for m in re.finditer(WA_LINK_PATTERN, text):
        num = clean_number(m.group(1))
        if num and num not in seen:
            seen.add(num)
            results.append({
                'raw': m.group(1),
                'formatted': num,
                'wa_link': f'https://wa.me/{num[1:]}',  # strip '+'
            })

    # then general phone patterns
    for pattern in INDO_PHONE_PATTERNS:
        for m in re.finditer(pattern, text):
            num = clean_number(m.group(0))
            if num and num not in seen:
                seen.add(num)
                results.append({
                    'raw': m.group(0).strip(),
                    'formatted': num,
                    'wa_link': f'https://wa.me/{num[1:]}',
                })

    return results


# --- Simple HTML text extractor ---

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            self._parts.append(data)

    def get_text(self) -> str:
        return ' '.join(self._parts)


def fetch_text_from_url(url: str) -> str:
    """Download page and strip HTML tags."""
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (LAKOO Bazaar Outreach)'})
    with urlopen(req, timeout=15) as resp:
        html = resp.read().decode('utf-8', errors='replace')
    # also search raw html (for wa.me links in href attributes)
    extractor = TextExtractor()
    extractor.feed(html)
    return html + '\n' + extractor.get_text()


# --- Output ---

def print_results(numbers: list[dict], source: str):
    if not numbers:
        print(f'No Indonesian WhatsApp numbers found in: {source}')
        return

    print(f'\n{"="*60}')
    print(f' LAKOO Bazaar WhatsApp Extractor')
    print(f' Source: {source}')
    print(f' Found:  {len(numbers)} number(s)')
    print(f'{"="*60}\n')

    for i, n in enumerate(numbers, 1):
        print(f'  {i}. {n["formatted"]}')
        print(f'     Raw:  {n["raw"]}')
        print(f'     Chat: {n["wa_link"]}')
        print()


def save_csv(numbers: list[dict], source: str, path: str):
    with open(path, 'a', newline='') as f:
        writer = csv.writer(f)
        if f.tell() == 0:
            writer.writerow(['timestamp', 'source', 'phone', 'wa_link', 'brand_name', 'notes'])
        for n in numbers:
            writer.writerow([
                datetime.now().isoformat(timespec='seconds'),
                source,
                n['formatted'],
                n['wa_link'],
                '',  # brand_name — fill in manually
                '',  # notes
            ])
    print(f'Appended {len(numbers)} rows to {path}')


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        description='Extract WhatsApp numbers from bazaar listings for LAKOO outreach')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--url', help='URL of bazaar event page to scrape')
    group.add_argument('--text', help='Raw text to extract numbers from')
    group.add_argument('--file', help='Path to text file with brand info')
    parser.add_argument('--output', '-o', help='Append results to CSV file')
    args = parser.parse_args()

    if args.url:
        source = args.url
        text = fetch_text_from_url(args.url)
    elif args.file:
        source = args.file
        with open(args.file) as f:
            text = f.read()
    else:
        source = 'cli-text'
        text = args.text

    numbers = extract_numbers(text)
    print_results(numbers, source)

    if args.output:
        save_csv(numbers, source, args.output)


if __name__ == '__main__':
    main()
