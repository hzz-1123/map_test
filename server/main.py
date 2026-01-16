from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import Counter
import os
import json
from pymongo import MongoClient


category_map = {"military": "军事",
                "politics": "政治",
                "diplomacy": "外交",
                "security": "安全",
                "economy": "经济",
                "technology": "科技"}

app = Flask(__name__)
CORS(app)

db = MongoClient("mongodb://localhost:27017/").complex_events_data

# 点路径获取值
def get_value(d, path):
    if d is None: return None
    keys = path.split('.')
    for i, key in enumerate(keys):
        if isinstance(d, dict):
            d = d.get(key)
        elif isinstance(d, list):
            # 如果当前是列表，对列表中每个项尝试获取剩余的路径
            remaining_path = ".".join(keys[i:])
            for item in d:
                res = get_value(item, remaining_path)
                if res is not None:
                    return res
            return None
        else:
            return None
    return d

# 递归
def find_all_paths(data, parent_path=""):
    paths = []
    if isinstance(data, dict):
        for k, v in data.items():
            current_path = f"{parent_path}.{k}" if parent_path else k
            paths.append(current_path)
            paths.extend(find_all_paths(v, current_path))
    elif isinstance(data, list):
        if len(data) > 0 and isinstance(data[0], (dict, list)):
            paths.extend(find_all_paths(data[0], parent_path))
    return paths


def find_field_name_by_kw(tn = 'extract_results', kw = 'events_type'):
    sample_doc = db[tn].find_one()
    if not sample_doc:
        return None
    all_paths = find_all_paths(sample_doc)
    matched_paths = [p for p in all_paths if kw in p]
    return matched_paths if matched_paths else None

# 只有外层
def get_data(tablename, field_list):
    projection = {field: 1 for field in field_list}
    projection['_id'] = 0
    cursor = db[f'{tablename}'].find({}, projection)
    results = list(cursor)
    return results


def get_category_mappings(id, refer_fn):
    # 这里是列表
    matched_paths = find_field_name_by_kw('events_type', 'events_type')
    matched_paths_without_id = [p for p in matched_paths if 'id' not in p]
    dot_path = next((p for p in matched_paths if refer_fn in p), None)
    filtered_data = db['events_type'].find_one({dot_path: id}, {'_id': 0})
    results = {}
    for mp in matched_paths_without_id:
        value = get_value(filtered_data, mp)
        results[mp.split('.')[-1]] = value
    return results    
     

@app.route('/api/getData', methods=['GET'])
def calculate_frequency():
    category = request.args.get('category', 'military')
    fields = request.args.getlist('fields') or ['address_id', 'events_type']
    data = get_data('extract_results', fields)
    addresses = get_data('address', ['address_id', 'country'])
    all_seen_ids = []
    idx = 0
    for record in data:
        # 类别
        target_fn = find_field_name_by_kw('extract_results', 'events_type')[0]
        event_type_id = get_data('extract_results', [target_fn])[idx][f'{target_fn}']
        idx += 1
        category_mappings = get_category_mappings(event_type_id, target_fn)
        category_mappings['events_type_1'] = category_mappings.get('events_type_1').split('类')[0]
        print(category_mappings)
        if category_mappings.get('events_type_1') != category_map.get(category):
            continue

        addr_ids = record.get('address_id', [])
        if not isinstance(addr_ids, list):
            addr_ids = [addr_ids]
        for addr_obj in addr_ids:
            if isinstance(addr_obj, dict) and 'id' in addr_obj:
                all_seen_ids.append(addr_obj['id']) 
    
    id_counts = Counter(all_seen_ids)
    country_stats = {}
    for addr in addresses:
        a_id = addr['address_id']
        country = addr['country']
        count = id_counts.get(a_id, 0)

        if count > 0:
            country_stats[country] = country_stats.get(country, 0) + count

        


    cal_results = [{'country': k, 'count': v} for k, v in country_stats.items()]
    return jsonify(cal_results)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)