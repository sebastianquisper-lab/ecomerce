import React, { useState } from "react";
import SupportAiChat from "./SupportAiChat";

export default function SupportWidget({ defaultCreatorEmail = "" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
        <div className="support-widget">
            {open && (
                <div className="chat-panel">
                <SupportAiChat defaultCreatorEmail={defaultCreatorEmail} />
                </div>
            )}
            <button className="chat-button" onClick={() => setOpen(!open)}>💬</button>
        </div>

    </>
  );
}

