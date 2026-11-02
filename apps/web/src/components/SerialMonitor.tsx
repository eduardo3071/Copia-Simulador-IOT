import { useEffect, useRef, useState } from "react";
import { useApp } from "../store.ts";

export function SerialMonitor() {
  const serial = useApp((s) => s.serial);
  const running = useApp((s) => s.sim.runState === "running");
  const { sendSerial, clearSerial } = useApp.getState();
  const [text, setText] = useState("");
  const outRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [serial]);

  return (
    <section className="serial">
      <div className="serial-header">
        <strong>Monitor serial</strong> <span className="muted">9600 baud (USART0)</span>
        <button onClick={clearSerial}>Limpar</button>
      </div>
      <pre ref={outRef} className="serial-out" data-testid="serial-output">{serial}</pre>
      <form
        className="serial-in"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text) return;
          sendSerial(`${text}\n`);
          setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enviar para a placa…" disabled={!running} />
        <button type="submit" disabled={!running}>Enviar</button>
      </form>
    </section>
  );
}