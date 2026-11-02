import json, sys, uuid, urllib.request
NO_EVIDENCE = "This assistant is designed to answer questions about David Clinton"
base = sys.argv[1]
for q in open(sys.argv[2]).read().strip().split("\n"):
    body = json.dumps({"messages":[{"role":"user","content":q}],"improvementLogging":True,
        "conversationId":str(uuid.uuid4()),"turnId":str(uuid.uuid4())}).encode()
    req = urllib.request.Request(base+"/ask-ai/chat", data=body, headers={"Content-Type":"application/json"})
    text, event, intent, nsrc = "", None, "", 0
    with urllib.request.urlopen(req, timeout=90) as r:
        for line in r.read().decode().split("\n"):
            if line.startswith("event: "): event = line[7:]
            elif line.startswith("data: "):
                d = json.loads(line[6:])
                if event == "delta": text += d["text"]
                elif event == "retrieval": intent = d.get("intent","")
                elif event == "citations": nsrc = len(d.get("sources",[]))
                elif event == "error": text += "[ERROR] " + d.get("detail","")
    flag = "SCOPE-REFUSAL" if NO_EVIDENCE in text else ("ERROR" if "[ERROR]" in text else "ok")
    print(f"--- [{flag}] {q}  (intent={intent}, sources={nsrc})\n{text[:400]}\n")
