"use client";
import { Facebook, Mail, PhoneCall } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: false }}
      id="contact"
      className="bg-[#113F67] text-white py-6 mt-10"
    >
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
       
        <a
          href="#form"
          className="flex items-center space-x-2 text-lg font-bold mb-4 md:mb-0 cursor-pointer"
        >
          <Image
            src="/UI/img/BiocellaLogo.png"
            alt="Scientific laboratory research"
            className="w-10 h-10 rounded-tl-2xl rounded-bl-2xl object-cover"
            width={40}
            height={40}
          />
          <span>Biocella</span>
        </a>

        <a
          href="mailto:BiologyDept@usc.edu.ph"
          className="flex items-center space-x-2"
        >
          <Mail size={18} />
          <span>BiologyDept@usc.edu.ph</span>
        </a>

        <a href="tel:+639664288917" className="flex items-center space-x-2">
          <PhoneCall size={18} />
          <span>+639 664 288 917</span>
        </a>

        <a href="https://www.facebook.com/USCBioDept" target="_blank" className="flex items-center space-x-2">
          <Facebook size={18} />
          <span>USC Biology</span>
        </a>
      </div>
    </motion.footer>
  );
}
