import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Inbox, Send, FileText, Trash, Star, Pen } from "lucide-react";

const Sidebar = () => {
  const location = useLocation(); // Get current URL path

  const navItems = [
    { name: "Inbox", icon: <Inbox size={20} />, path: "/inbox" },
    { name: "Drafts", icon: <FileText size={20} />, path: "/drafts" },
    { name: "Sent", icon: <Send size={20} />, path: "/sent" },
    { name: "Trash", icon: <Trash size={20} />, path: "/trash" },
    { name: "Compose", icon: <Pen size={20} />, path: "/compose" },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">📧 Mailbox</h2>
      <ul className="h-[500px] flex flex-col justify-evenly ">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                location.pathname === item.path
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              {item.icon}
              <span className="text-lg">{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
