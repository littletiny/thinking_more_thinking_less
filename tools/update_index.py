#!/usr/bin/env python3
"""
Zettel Knowledge Base Index Manager

Usage:
    python tools/update_index.py [command] [options]

Commands:
    add-conversation <file> <topic> <date> [concepts...]
                       - 添加新对话记录
    add-concept <name> <category> [file]
                       - 添加新概念
    add-connection <file> <concept1> <concept2> [concept3...]
                       - 添加概念关联
    remove-conversation <file>
                       - 删除对话记录
    remove-concept <name>
                       - 删除概念
    update-stats       - 更新统计信息（自动统计文件数量）
    reindex            - 完全重建索引（扫描目录重新生成）
    validate           - 验证索引一致性
    help               - 显示帮助

Examples:
    # 添加新对话
    python tools/update_index.py add-conversation \\
        "2026-03-09-new-concept.md" \\
        "新概念的讨论" \\
        "2026-03-09" \\
        "new-concept" "related-concept"

    # 添加新概念
    python tools/update_index.py add-concept \\
        "new-concept" \\
        "解决方法论"

    # 添加概念关联
    python tools/update_index.py add-connection \\
        "connections/new-concept-x-related.md" \\
        "new-concept" \\
        "related-concept"

    # 更新统计
    python tools/update_index.py update-stats

    # 验证索引
    python tools/update_index.py validate
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Get project root
TOOLS_DIR = Path(__file__).parent
BASE_DIR = TOOLS_DIR.parent
INDEX_FILE = BASE_DIR / "index.json"


def load_index():
    """Load the index.json file."""
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_index(index):
    """Save the index.json file with formatting."""
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
        f.write('\n')


def add_conversation(file, topic, date, concepts=None):
    """Add a new conversation entry."""
    index = load_index()
    
    # Check if already exists
    for conv in index['conversations']:
        if conv['file'] == file:
            print(f"⚠️  Conversation '{file}' already exists. Updating...")
            conv['topic'] = topic
            conv['date'] = date
            conv['concepts'] = concepts or []
            save_index(index)
            print(f"✅ Updated conversation: {file}")
            return
    
    # Add new
    new_conv = {
        'file': file,
        'topic': topic,
        'date': date,
        'concepts': concepts or []
    }
    index['conversations'].append(new_conv)
    
    # Update stats
    index['metadata']['total_conversations'] = len(index['conversations'])
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print(f"✅ Added conversation: {file}")
    print(f"   Topic: {topic}")
    print(f"   Date: {date}")
    print(f"   Concepts: {', '.join(concepts) if concepts else 'None'}")


def add_concept(name, category, file=None):
    """Add a new concept entry."""
    index = load_index()
    
    # Validate category
    valid_categories = ['认知偏差与陷阱', '解决方法论', '工具与基础设施']
    if category not in valid_categories:
        print(f"⚠️  Unknown category '{category}'")
        print(f"   Valid categories: {', '.join(valid_categories)}")
        response = input("Continue anyway? [y/N]: ")
        if response.lower() != 'y':
            return
    
    # Check if already exists
    for concept in index['concepts']:
        if concept['name'] == name:
            print(f"⚠️  Concept '{name}' already exists. Updating...")
            concept['category'] = category
            if file:
                concept['file'] = file
            save_index(index)
            print(f"✅ Updated concept: {name}")
            return
    
    # Auto-generate file path if not provided
    if not file:
        file = f"concepts/{name}.md"
    
    # Add new
    new_concept = {
        'name': name,
        'category': category,
        'file': file
    }
    index['concepts'].append(new_concept)
    
    # Update stats
    index['metadata']['total_concepts'] = len(index['concepts'])
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print(f"✅ Added concept: {name}")
    print(f"   Category: {category}")
    print(f"   File: {file}")


def add_connection(file, concepts):
    """Add a new connection entry."""
    index = load_index()
    
    if len(concepts) < 2:
        print("❌ Error: Connection requires at least 2 concepts")
        return
    
    # Check if already exists
    for conn in index['connections']:
        if conn['file'] == file:
            print(f"⚠️  Connection '{file}' already exists. Updating...")
            conn['concepts'] = concepts
            save_index(index)
            print(f"✅ Updated connection: {file}")
            return
    
    # Add new
    new_conn = {
        'file': file,
        'concepts': concepts
    }
    index['connections'].append(new_conn)
    
    # Update stats
    index['metadata']['total_connections'] = len(index['connections'])
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print(f"✅ Added connection: {file}")
    print(f"   Concepts: {' × '.join(concepts)}")


def remove_conversation(file):
    """Remove a conversation entry."""
    index = load_index()
    
    original_count = len(index['conversations'])
    index['conversations'] = [c for c in index['conversations'] if c['file'] != file]
    
    if len(index['conversations']) == original_count:
        print(f"⚠️  Conversation '{file}' not found")
        return
    
    index['metadata']['total_conversations'] = len(index['conversations'])
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print(f"✅ Removed conversation: {file}")


def remove_concept(name):
    """Remove a concept entry."""
    index = load_index()
    
    original_count = len(index['concepts'])
    index['concepts'] = [c for c in index['concepts'] if c['name'] != name]
    
    if len(index['concepts']) == original_count:
        print(f"⚠️  Concept '{name}' not found")
        return
    
    # Also remove from conversations
    for conv in index['conversations']:
        if name in conv['concepts']:
            conv['concepts'].remove(name)
    
    # Also remove connections involving this concept
    index['connections'] = [c for c in index['connections'] if name not in c['concepts']]
    
    index['metadata']['total_concepts'] = len(index['concepts'])
    index['metadata']['total_connections'] = len(index['connections'])
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print(f"✅ Removed concept: {name}")
    print("   Also removed from related conversations and connections")


def update_stats():
    """Update statistics by scanning actual files."""
    index = load_index()
    
    # Count actual files
    conv_count = len(list((BASE_DIR / 'conversations').glob('*.md')))
    concept_count = len(list((BASE_DIR / 'concepts').glob('*.md')))
    connection_count = len(list((BASE_DIR / 'connections').glob('*.md')))
    
    # Update index
    index['metadata']['total_conversations'] = conv_count
    index['metadata']['total_concepts'] = concept_count
    index['metadata']['total_connections'] = connection_count
    index['metadata']['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    save_index(index)
    print("✅ Updated statistics:")
    print(f"   Conversations: {conv_count}")
    print(f"   Concepts: {concept_count}")
    print(f"   Connections: {connection_count}")
    print(f"   Last Updated: {index['metadata']['last_updated']}")


def reindex():
    """Rebuild index from scratch by scanning directories."""
    print("🔄 Rebuilding index from scratch...")
    
    new_index = {
        'metadata': {
            'version': '1.0',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'total_conversations': 0,
            'total_concepts': 0,
            'total_connections': 0
        },
        'conversations': [],
        'concepts': [],
        'connections': []
    }
    
    # Scan conversations
    conv_dir = BASE_DIR / 'conversations'
    if conv_dir.exists():
        for file in sorted(conv_dir.glob('*.md')):
            if file.name == 'README.md':
                continue
            # Try to extract date and topic from filename
            # Format: YYYY-MM-DD-topic.md
            parts = file.stem.split('-')
            if len(parts) >= 3:
                date = '-'.join(parts[:3])
                topic = '-'.join(parts[3:]).replace('-', ' ').title()
            else:
                date = '2026-01-01'
                topic = file.stem
            
            new_index['conversations'].append({
                'file': file.name,
                'topic': topic,
                'date': date,
                'concepts': []
            })
    
    # Scan concepts
    concept_dir = BASE_DIR / 'concepts'
    if concept_dir.exists():
        for file in sorted(concept_dir.glob('*.md')):
            new_index['concepts'].append({
                'name': file.stem,
                'category': '解决方法论',  # Default, needs manual categorization
                'file': f'concepts/{file.name}'
            })
    
    # Scan connections
    conn_dir = BASE_DIR / 'connections'
    if conn_dir.exists():
        for file in sorted(conn_dir.glob('*.md')):
            # Try to extract concepts from filename: concept1-x-concept2.md
            parts = file.stem.split('-x-')
            if len(parts) >= 2:
                concepts = parts
            else:
                concepts = [file.stem]
            
            new_index['connections'].append({
                'file': f'connections/{file.name}',
                'concepts': concepts
            })
    
    # Update stats
    new_index['metadata']['total_conversations'] = len(new_index['conversations'])
    new_index['metadata']['total_concepts'] = len(new_index['concepts'])
    new_index['metadata']['total_connections'] = len(new_index['connections'])
    
    save_index(new_index)
    print("✅ Index rebuilt!")
    print(f"   Conversations: {new_index['metadata']['total_conversations']}")
    print(f"   Concepts: {new_index['metadata']['total_concepts']}")
    print(f"   Connections: {new_index['metadata']['total_connections']}")
    print("\n⚠️  Note: Categories and concept associations need manual review")


def validate():
    """Validate index consistency."""
    index = load_index()
    errors = []
    warnings = []
    
    # Check if all referenced files exist
    for conv in index['conversations']:
        file_path = BASE_DIR / 'conversations' / conv['file']
        if not file_path.exists():
            errors.append(f"Missing conversation file: {conv['file']}")
    
    for concept in index['concepts']:
        file_path = BASE_DIR / concept['file']
        if not file_path.exists():
            errors.append(f"Missing concept file: {concept['file']}")
    
    for conn in index['connections']:
        file_path = BASE_DIR / conn['file']
        if not file_path.exists():
            errors.append(f"Missing connection file: {conn['file']}")
    
    # Check if all concepts in conversations exist
    for conv in index['conversations']:
        for concept_name in conv['concepts']:
            if not any(c['name'] == concept_name for c in index['concepts']):
                errors.append(f"Unknown concept '{concept_name}' in conversation '{conv['file']}'")
    
    # Check if all concepts in connections exist
    for conn in index['connections']:
        for concept_name in conn['concepts']:
            if not any(c['name'] == concept_name for c in index['concepts']):
                errors.append(f"Unknown concept '{concept_name}' in connection '{conn['file']}'")
    
    # Check stats consistency
    if index['metadata']['total_conversations'] != len(index['conversations']):
        warnings.append(f"Conversation count mismatch: metadata={index['metadata']['total_conversations']}, actual={len(index['conversations'])}")
    
    if index['metadata']['total_concepts'] != len(index['concepts']):
        warnings.append(f"Concept count mismatch: metadata={index['metadata']['total_concepts']}, actual={len(index['concepts'])}")
    
    if index['metadata']['total_connections'] != len(index['connections']):
        warnings.append(f"Connection count mismatch: metadata={index['metadata']['total_connections']}, actual={len(index['connections'])}")
    
    # Report
    if errors:
        print("\n❌ Errors found:")
        for e in errors:
            print(f"   • {e}")
    
    if warnings:
        print("\n⚠️  Warnings:")
        for w in warnings:
            print(f"   • {w}")
    
    if not errors and not warnings:
        print("\n✅ Index is valid!")
    elif not errors:
        print("\n⚠️  Index has warnings but no critical errors")
    else:
        print(f"\n❌ Found {len(errors)} error(s)")


def main():
    """Main entry point."""
    args = sys.argv[1:]
    
    if not args or args[0] in ('help', '--help', '-h'):
        print(__doc__)
        return
    
    command = args[0]
    
    try:
        if command == 'add-conversation':
            if len(args) < 4:
                print("❌ Error: add-conversation requires at least 3 arguments")
                print("Usage: update_index.py add-conversation <file> <topic> <date> [concepts...]")
                return
            file, topic, date = args[1], args[2], args[3]
            concepts = args[4:] if len(args) > 4 else []
            add_conversation(file, topic, date, concepts)
            
        elif command == 'add-concept':
            if len(args) < 3:
                print("❌ Error: add-concept requires at least 2 arguments")
                print("Usage: update_index.py add-concept <name> <category> [file]")
                return
            name, category = args[1], args[2]
            file = args[3] if len(args) > 3 else None
            add_concept(name, category, file)
            
        elif command == 'add-connection':
            if len(args) < 4:
                print("❌ Error: add-connection requires at least 3 arguments")
                print("Usage: update_index.py add-connection <file> <concept1> <concept2> [concept3...]")
                return
            file = args[1]
            concepts = args[2:]
            add_connection(file, concepts)
            
        elif command == 'remove-conversation':
            if len(args) < 2:
                print("❌ Error: remove-conversation requires a file argument")
                return
            remove_conversation(args[1])
            
        elif command == 'remove-concept':
            if len(args) < 2:
                print("❌ Error: remove-concept requires a name argument")
                return
            remove_concept(args[1])
            
        elif command == 'update-stats':
            update_stats()
            
        elif command == 'reindex':
            response = input("⚠️  This will rebuild the entire index. Continue? [y/N]: ")
            if response.lower() == 'y':
                reindex()
            else:
                print("Cancelled")
                
        elif command == 'validate':
            validate()
            
        else:
            print(f"Unknown command: {command}")
            print('Run "python tools/update_index.py help" for usage.')
            
    except FileNotFoundError as e:
        print(f"❌ Error: File not found - {e}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in index file - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
