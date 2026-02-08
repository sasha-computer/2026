#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = [
#   "requests",
# ]
# ///
"""
Brave Search API client
Usage: uv run brave_search.py "your search query"
"""

import os
import sys
import requests

API_KEY_ENV = "BRAVE_SEARCH_API_KEY"
SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"

def search(query: str) -> dict:
    """Search using Brave Search API"""
    api_key = os.getenv(API_KEY_ENV)
    if not api_key:
        raise RuntimeError(
            f"Missing {API_KEY_ENV}. Export your Brave Search API key before running."
        )
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key
    }
    params = {
        "q": query,
        "count": 10
    }

    response = requests.get(SEARCH_URL, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def main():
    if len(sys.argv) < 2:
        print("Usage: uv run brave_search.py 'your search query'")
        sys.exit(1)

    query = " ".join(sys.argv[1:])
    print(f"Searching for: {query}\n")

    results = search(query)

    # Print web results
    if "web" in results and "results" in results["web"]:
        for i, result in enumerate(results["web"]["results"], 1):
            print(f"{i}. {result.get('title', 'No title')}")
            print(f"   URL: {result.get('url', 'No URL')}")
            if "description" in result:
                print(f"   {result['description']}")
            print()

if __name__ == "__main__":
    main()
