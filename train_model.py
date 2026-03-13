import csv
import re
import json
import math
import pickle
from collections import Counter

def tokenize(text):
    return re.findall(r'\w+', text.lower())

print("Loading dataset...")
contexts = []
responses = []

with open('train.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader) # skip header
    for row in reader:
        if len(row) >= 2 and row[0].strip() and row[1].strip():
            contexts.append(row[0].strip())
            responses.append(row[1].strip())

print(f"Loaded {len(contexts)} rows.")

print("Building pure-python TF-IDF model...")
# Compute DF
document_freq = Counter()
for c in contexts:
    words = set(tokenize(c))
    for w in words:
        document_freq[w] += 1

N = len(contexts)
idf = {w: math.log(N / df) for w, df in document_freq.items()}

# We will save idf, contexts (tokenized), and responses.
# To save space and time, we just store term freqs per document
doc_vectors = []
for c in contexts:
    tf = Counter(tokenize(c))
    # compute length for cosine norm
    norm = 0.0
    vec = {}
    for w, count in tf.items():
        if w in idf:
            weight = count * idf[w]
            vec[w] = weight
            norm += weight ** 2
    norm = math.sqrt(norm)
    if norm > 0:
        for w in vec:
            vec[w] /= norm
    doc_vectors.append(vec)

print("Saving models to rag_model.pkl...")
with open('rag_model.pkl', 'wb') as f:
    pickle.dump({
        'idf': idf,
        'doc_vectors': doc_vectors,
        'responses': responses
    }, f)

print("Training complete! Model saved.")
