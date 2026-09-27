import { useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { format } from "date-fns";
import { Headphones, Loader2, Send, UserCircle2 } from "lucide-react";

function getSessionId() {
  let sid = localStorage.getItem("uc_support_sid");
  if (!sid) {
    sid = "sid_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("uc_support_sid", sid);
  }
  return sid;
}

export function SupportChat({ initialMessage = "", initialName = "" }: { initialMessage?: string; initialName?: string }) {
  const [sessionId] = useState(getSessionId);
  const [message, setMessage] = useState(initialMessage);
  const [name, setName] = useState(() => localStorage.getItem("uc_support_name") || initialName);
  const [isNameSet, setIsNameSet] = useState(() => Boolean(localStorage.getItem("uc_support_name") || initialName));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Array<{ id: number; senderName: string; message: string; isAgent: boolean; createdAt: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setIsLoading(false); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("support_messages").select("id,sender_name,message,is_agent,created_at").eq("session_id", sessionId).order("created_at");
      if (active) {
        setMessages((data ?? []).map((row) => ({ id: row.id, senderName: row.sender_name, message: row.message, isAgent: row.is_agent, createdAt: row.created_at })));
        setIsLoading(false);
      }
    };
    void load();
    const channel = supabase.channel(`support-${sessionId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `session_id=eq.${sessionId}` }, () => { void load(); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartChat = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem("uc_support_name", name.trim());
    setName(name.trim());
    setIsNameSet(true);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !isNameSet || sending || !supabaseConfigured) return;
    setSending(true);
    const { data } = await supabase.from("support_messages").insert({ session_id: sessionId, sender_name: name, message: trimmedMessage }).select("id,sender_name,message,is_agent,created_at").single();
    if (data) setMessages((current) => [...current, { id: data.id, senderName: data.sender_name, message: data.message, isAgent: data.is_agent, createdAt: data.created_at }]);
    setMessage("");
    setSending(false);
  };

  return (
    <div className="support-chat-compact">
      <div className="support-chat-header">
        <div className="support-chat-header-icon"><Headphones size={18} /></div>
        <div>
          <strong>Usta Cepte Destek</strong>
          <span>Genellikle birkaç dakika içinde yanıtlar</span>
        </div>
      </div>
      {!isNameSet ? (
        <form onSubmit={handleStartChat} className="support-chat-start">
          <UserCircle2 size={34} />
          <strong>Sohbeti başlatın</strong>
          <span>Size hitap edebilmemiz için adınızı yazın.</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Adınız Soyadınız" autoFocus />
          <button type="submit" disabled={!name.trim()}>Desteğe Bağlan</button>
        </form>
      ) : (
        <>
          <div className="support-chat-messages">
            {isLoading && !messages ? (
              <div className="support-chat-empty"><Loader2 size={18} className="support-chat-spin" /> Mesajlar yükleniyor…</div>
            ) : messages?.length === 0 ? (
              <div className="support-chat-empty"><Headphones size={34} /><strong>Size yardımcı olmaya hazırız.</strong><span>İlk mesajınızı göndererek sohbeti başlatın.</span></div>
            ) : messages?.map((msg) => {
              const isMine = !msg.isAgent;
              return (
                <div key={msg.id} className={`support-chat-message ${isMine ? "mine" : "agent"}`}>
                  <small>{msg.senderName} · {format(new Date(msg.createdAt), "HH:mm")}</small>
                  <div>{msg.message}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="support-chat-compose">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Mesajınızı yazın…" />
            <button type="submit" disabled={!message.trim() || sending || !supabaseConfigured} aria-label="Mesaj gönder">
              {sending ? <Loader2 size={17} className="support-chat-spin" /> : <Send size={17} />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}