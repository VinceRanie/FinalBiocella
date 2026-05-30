"use client"
import Image from "next/image";
import {useRouter} from "next/navigation"
import Chatbot from "./ChatBot"

const Form = () => {
  const router = useRouter();
  return (
    <div id="form" className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex text-[#113F67]">
      {/* Left Content Section */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
        <div className="max-w-lg space-y-8">
          {/* BioCella Logo and Branding */}
          <div className="space-y-2">
         
            <h1 className="text-5xl font-bold text-[#113F67] flex items-center gap-3">
              Biocella
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-biocella-green to-biocella-blue rounded-full"></div>
          </div>
          {/* Tagline */}
          <div className="space-y-4">
            <p className="text-xl font-medium text-[#113F67] leading-relaxed ">
              Welcome University of San Carlos Students! Sign in to explore exclusive BioCella features.
            </p>
          </div>
          {/* Login Button */}
          <div className="pt-2 text-white">
            <button onClick={()=>router.push("/Login")}
              className="cursor-pointer bg-[#113F67] rounded-xl px-12 py-3 text-lg uppercase tracking-wider transform transition-all duration-300 hover:shadow-2xl"
            >
              LOGIN
            </button>
          </div>
          {/* Additional Features Hint */}
          <div className="pt-8 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-biocella-green rounded-full"></div>
              <span>Research collaboration tools</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2  rounded-full"></div>
              <span>Laboratory management system</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-biocella-molecular rounded-full"></div>
              <span>Academic resource sharing</span>
            </div>
          </div>
        </div>
      </div>
      {/* Right Image Section */}
      <div className="rounded-tl-2xl rounded-bl-2xl flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10"></div>
        <Image
          src="/UI/img/Biobuilding.webp"
         alt="USC Biology Building (Arnoldus Science Building)"
          className="w-full h-full rounded-tl-2xl rounded-bl-2xl object-cover"
          width={4000}     
          height={4000} 
        />
        <Chatbot/>
        {/* Floating Elements */}
  
      </div>
    </div>
  );
};

export default Form;