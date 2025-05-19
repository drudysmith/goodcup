'use client'

import Layout from '../components/Layout';
import Section from '../components/Section';

export default function Home() {
  return (
    <Layout>
      <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[90vh] min-h-[350px] max-h-[800px] -mt-[120px] border-b border-[#565e77] transition-all duration-500 overflow-hidden">
        <video
          src="https://res.cloudinary.com/drtaph2gu/video/upload/f_auto,q_auto/k0ht0d2srp5oglxhrhmc.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-['Roboto','Poppins',sans-serif] font-light text-2xl md:text-4xl text-center px-4 drop-shadow-lg">
            Go Deep, Come Up Clear, Bring Vitality to Everything
          </span>
        </div>
      </section>
      <Section
        title="Tackle Your Leadership & Career Challenges Head-On"
        text="No more second-guessing. No more feeling alone with tough decisions. Get fast, tailored support from mentors who've been there."
        media={<img src="/placeholder2.jpg" alt="Leadership support" />}
        reverse
        bgColor="bg-[#bec6c3]"
      />
      <Section
        title="Grow With Community Support"
        text="Join a supportive community focused on mutual growth and success. Share experiences, ask questions, and connect with mentors and peers."
        media={<img src="/placeholder3.jpg" alt="Community support" />}
        bgColor="bg-[#9badad]"
      />
      <Section
        title="Flexible Scheduling for Busy Lives"
        text="Flexible scheduling fits even the busiest calendars. Book sessions at times that work for you and your mentor."
        media={<img src="/placeholder4.jpg" alt="Flexible scheduling" />}
        reverse
        bgColor="bg-[#7c949c]"
      />
    </Layout>
  );
}
