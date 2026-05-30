"use client"
import { motion } from "framer-motion";
import Image from "next/image";

type AboutUsProps = {
  totalSpecimens?: number;
  carolinianCount?: number;
};

export default function AboutUs({ totalSpecimens = 0, carolinianCount = 0 }: AboutUsProps) {
    return (
      <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: .5 }}
      viewport={{ once: false }} id="AboutUs"
      className="py-14 px-2 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#113F67] mb-4">About Us</h2>
            <div className="w-24 h-1 bg-[#113F67] mx-auto rounded-full"></div>
          </div>
  
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg text-gray-700 leading-relaxed">
              The Functional Microbiology Laboratory is a team of dedicated researchers and scientists committed to exploring the vast potential of the microbial world. Our mission is to bridge the gap between fundamental research and practical application by translating laboratory findings into effective solutions for global challenges. We specialize in bioprospecting and isolating functional microorganisms such as actinomycetes and yeasts from diverse ecosystems, including marine environments and other unique habitats.
              </p>
              <p className="text-gray-600">
              By characterizing the natural products and bioactive compounds these microbes produce, we aim to drive innovation in fields such as medicine, agriculture, and biotechnology. Through our work, we transform microscopic discoveries into impactful, real-world results for a more sustainable future.
              </p>
  
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-[#113F67]">{totalSpecimens.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Specimen Studied</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{carolinianCount.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Carolinians</div>
                </div>
              </div>
            </div>
  
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <Image
                  src="/UI/img/Laboratory.jpg"
                  alt="Microscopic view of microorganisms"
                  width={500}
                  height={300}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-[#113F67] rounded-full"></div>
                    <span className="text-sm text-gray-700">Microbial Researches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Current Carlinian Users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-gray-600 italic">&quot;Exploring the invisible world to create visible impact&quot;</p>
          </div>
        </div>
      </motion.section>
    )
  }
  