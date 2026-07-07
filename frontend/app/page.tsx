"use client";

import { useRouter } from "next/navigation";
import { HERO_BACKGROUND_IMAGE } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  return (
    <main className="w-full">
      {/* Hero Section with Grey to White Gradient */}
      <section className="relative w-full bg-gradient-to-b from-gray-800 to-white">
        {/* Background Image Section - 50vh */}
        <div
          className="relative w-full h-[50vh] bg-cover bg-center"
          style={{
            backgroundImage: `url("${HERO_BACKGROUND_IMAGE}")`,
          }}
        >
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Title positioned half on image, half outside */}
        <div className="relative px-4 text-center -translate-y-1/2">
          <h1 className="text-6xl md:text-7xl font-bold text-white drop-shadow-lg">
            ProcureNext
          </h1>
        </div>

        {/* Buttons Section */}
        <div className="relative pt-12 pb-16 px-4 flex gap-6 justify-center flex-wrap">
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-gray-500"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup-master")}
            className="px-8 py-3 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700 font-semibold border-2 border-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-300 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:scale-105"
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* About Us Section */}
      <section className="w-full py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            About Us
          </h2>
          <div className="w-16 h-1 bg-gray-700 mx-auto mb-12"></div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            {/* Left Column */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                At ProcureNext, we believe that procurement should be simple,
                transparent, and efficient. Our mission is to revolutionize the
                way organizations manage their procurement processes by
                providing cutting-edge technology solutions.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We are committed to helping businesses reduce costs, improve
                supplier relationships, and streamline their supply chain
                operations.
              </p>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Why Choose Us?
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Industry-leading automation tools
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Real-time analytics and reporting
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Dedicated customer support 24/7
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-700 font-bold text-xl">✓</span>
                  <span className="text-gray-600">
                    Secure and compliant platform
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 pt-12 border-t border-gray-200">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">500+</p>
              <p className="text-gray-600">Active Clients</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">$2B+</p>
              <p className="text-gray-600">Procurement Value Managed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 mb-2">99.9%</p>
              <p className="text-gray-600">Uptime Guarantee</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
