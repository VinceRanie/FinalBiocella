"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import {MessageCircleMore,Minimize2} from "lucide-react"

const FAQ: Record<string, string> = {
  about: "We are passionate researchers and scientists dedicated to exploring the fascinating world of microorganisms. Our mission is to unlock the potential of these microscopic life forms to solve real-world challenges.",
  contact: "You can reach us at BiologyDept@usc.edu.ph or call +639664288917. We're available Mon–Fri, 8am–4pm.",
  collections:"Explore our extensive repository of microorganisms, carefully preserved and catalogued for research and discovery.",
  appointment:"Set an Appointment to ES23TC Laboratory. We're open Monday to Friday, 8:00 AM – 4:00 PM (Philippine Standard Time).",
  hours: "We're open Monday to Friday, 8:00 AM – 4:00 PM (Philippine Standard Time).",
  location: "We're based in University of San Carlos Talamban Campus (Arnoldus Science Complex).",
  help: "I can help with: About, Collections, Appointment, Hours, and Location. Just type a keyword!",
  hello: "Hey there! 👋 How can I help you today? Ask me about our Collections, Appointments, contact info, and more!.",
  hi: "Hey there! 👋 How can I help you today? Ask me about our Collections, Appointments, contact info, and more!.",
};

const DEFAULT_RESPONSE = "Sorry, I can only answer questions related to this website. Try asking about: About, Collections, Appointments, Contact.";

interface Message {
  text: string;
  isUser: boolean;
}


const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! 👋 Welcome to Biocella. Ask me about our Collections, Appointments, contact info, and more!", isUser: false },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase();
    for (const [key, value] of Object.entries(FAQ)) {
      if (lower.includes(key)) return value;
    }
    return DEFAULT_RESPONSE;
  };

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { text: text.trim(), isUser: true };
    const botMsg: Message = { text: getResponse(text), isUser: false };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }, []);

  const quickButtons = ["About", "Collections", "Appointment", "Contacts"];

  return (
    <div className="mb-10 cursor-pointer fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {isOpen && (
        <div
          className="w-[min(300px,calc(100vw-2.5rem))] rounded-2xl bg-card shadow-xl border border-[#113F67] bg-[#113F67] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ maxHeight: "min(480px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="bg-[#113F67] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white font-semibold text-sm">Chat Support</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer text-white hover:text-primary-foreground transition-colors text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className=" bg-white flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={` text-white-foreground max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.isUser
                      ? "bg-[#113F67] text-white rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick buttons */}
          <div className="bg-white px-3 pb-1 flex flex-wrap gap-1.5">
            {quickButtons.map((label) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                className="bg-[#113F67] text-xs px-2.5 py-1 rounded-full border border-[#113F67] text-white hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white p-3 pt-2 border-t border-[#113F67] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Type a message..."
              className=" flex-1 text-sm px-3 py-2 rounded-lg  bg-secondary border-[#113F67] text-[#113F67] placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring "
            />
            <button
              onClick={() => sendMessage(input)}
              className="bg-[#113F67] text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
  onClick={() => setIsOpen(!isOpen)}
  className="mb-30 cursor-pointer w-14 h-14 rounded-full bg-[#113F67] shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105"
  aria-label="Toggle chat"
>
  {isOpen ? <Minimize2 color="white" size={25} /> : <MessageCircleMore color="white" size={25} />}
</button>
    </div>
  );
};



export default ChatBot;
