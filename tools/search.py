#!/usr/bin/env python3
"""
Zettel Knowledge Base Search Tool

Usage:
    python tools/search.py [command] [query]

Commands:
    concept <name>     - 查找概念卡片
    conversation <id>  - 查找对话（可用日期或关键词）
    related <concept>  - 查找相关概念
    grep <pattern>     - 全文搜索内容
    list [type]        - 列出所有条目 (concepts|conversations|connections)
    stats              - 显示统计信息
    help               - 显示帮助

Examples:
    python tools/search.py concept observer-check
    python tools/search.py conversation 2026-03-07
    python tools/search.py related mock-driven-validation
    python tools/search.py grep "DIY"
    python tools/search.py list concepts
"""

import json
import os
import sys
from pathlib import Path

# Get project root
TOOLS_DIR = Path(__file__).parent
BASE_DIR = TOOLS_DIR.parent
INDEX_FILE = BASE_DIR / "index.json"


def load_index():
    """Load the index.json file."""
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def find_concept(index, query):
    """Find a concept by name (partial match)."""
    q = query.lower()
    for concept in index['concepts']:
        if q in concept['name'].lower():
            return concept
    return None


def find_conversations(index, query):
    """Find conversations by keyword or date."""
    q = query.lower()
    results = []
    for conv in index['conversations']:
        if (q in conv['file'].lower() or 
            q in conv['topic'].lower() or 
            q in conv['date']):
            results.append(conv)
    return results


def find_related(index, concept_name):
    """Find concepts related to the given concept."""
    related = set()
    for conn in index['connections']:
        if concept_name in conn['concepts']:
            for c in conn['concepts']:
                if c != concept_name:
                    related.add(c)
    return sorted(list(related))


def grep_files(pattern):
    """Search for pattern in all markdown files."""
    results = []
    dirs = ['concepts', 'conversations', 'connections', 'notes']
    
    for dir_name in dirs:
        dir_path = BASE_DIR / dir_name
        if not dir_path.exists():
            continue
            
        for file_path in dir_path.glob('*.md'):
            try:
                content = file_path.read_text(encoding='utf-8')
                if pattern.lower() in content.lower():
                    lines = content.split('\n')
                    for idx, line in enumerate(lines, 1):
                        if pattern.lower() in line.lower():
                            results.append({
                                'file': f"{dir_name}/{file_path.name}",
                                'line': idx,
                                'text': line.strip()[:100]
                            })
            except Exception:
                continue
    
    return results[:20]  # Limit results


def show_stats(index):
    """Display knowledge base statistics."""
    print('\n📊 Zettel Knowledge Base Stats\n')
    print(f"Conversations:  {index['metadata']['total_conversations']}")
    print(f"Concepts:       {index['metadata']['total_concepts']}")
    print(f"Connections:    {index['metadata']['total_connections']}")
    print(f"Last Updated:   {index['metadata']['last_updated']}")
    
    # Category breakdown
    categories = {}
    for concept in index['concepts']:
        cat = concept['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print('\n📑 Categories:')
    for cat, count in categories.items():
        print(f"  {cat}: {count}")


def list_items(index, item_type):
    """List all items of a given type."""
    if item_type == 'concepts':
        print('\n📄 Concepts:\n')
        for c in index['concepts']:
            print(f"  • {c['name']:<35} [{c['category']}]")
            
    elif item_type == 'conversations':
        print('\n💬 Conversations:\n')
        for c in index['conversations']:
            print(f"  • {c['date']} - {c['topic'][:50]}...")
            print(f"    File: {c['file']}")
            print(f"    Concepts: {', '.join(c['concepts'])}")
            print()
            
    elif item_type == 'connections':
        print('\n🔗 Connections:\n')
        for c in index['connections']:
            print(f"  • {' × '.join(c['concepts'])}")
            print(f"    File: {c['file']}")
            print()


def main():
    """Main entry point."""
    args = sys.argv[1:]
    command = args[0] if args else 'help'
    query = ' '.join(args[1:]) if len(args) > 1 else ''
    
    try:
        index = load_index()
        
        if command == 'concept':
            if not query:
                print('Usage: python tools/search.py concept <name>')
                return
            concept = find_concept(index, query)
            if concept:
                print(f"\n📄 {concept['name']}")
                print(f"   Category: {concept['category']}")
                print(f"   File: {concept['file']}")
                
                related = find_related(index, concept['name'])
                if related:
                    print(f"   Related: {', '.join(related)}")
            else:
                print(f'Concept "{query}" not found.')
                
        elif command == 'conversation':
            if not query:
                print('Usage: python tools/search.py conversation <keyword>')
                return
            conversations = find_conversations(index, query)
            if conversations:
                print(f"\n💬 Found {len(conversations)} conversation(s):\n")
                for c in conversations:
                    print(f"  • {c['date']} - {c['topic']}")
                    print(f"    File: conversations/{c['file']}")
                    print(f"    Concepts: {', '.join(c['concepts'])}")
                    print()
            else:
                print(f'No conversations found for "{query}".')
                
        elif command == 'related':
            if not query:
                print('Usage: python tools/search.py related <concept>')
                return
            concept_name = query.lower().replace(' ', '-')
            related = find_related(index, concept_name)
            if related:
                print(f"\n🔗 Concepts related to \"{query}\":\n")
                for r in related:
                    print(f"  • {r}")
            else:
                print(f'No related concepts found for "{query}".')
                
        elif command == 'grep':
            if not query:
                print('Usage: python tools/search.py grep <pattern>')
                return
            results = grep_files(query)
            if results:
                print(f"\n🔍 Found {len(results)} matches:\n")
                for r in results:
                    print(f"  {r['file']}:{r['line']}: {r['text']}")
            else:
                print(f'No matches found for "{query}".')
                
        elif command == 'list':
            list_items(index, query or 'concepts')
            
        elif command == 'stats':
            show_stats(index)
            
        elif command in ('help', '--help', '-h'):
            print(__doc__)
        else:
            print(f'Unknown command: {command}')
            print('Run "python tools/search.py help" for usage.')
            
    except FileNotFoundError:
        print(f'Error: {INDEX_FILE} not found.')
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f'Error: Invalid JSON in index file - {e}')
        sys.exit(1)
    except Exception as e:
        print(f'Error: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
