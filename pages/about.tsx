import Layout from '../components/Layout';
import Section from '../components/Section';


const IMAGE_2 = "https://res.cloudinary.com/drtaph2gu/image/upload/v1712345678/goodcup-mid.jpg";

export default function About() {
  return (
    <Layout>
      <div className="site-section-bg -mt-[120px] pt-[120px]">

        {/* First section: image left, text right */}
        <Section
          title="How about Goodcup"
          media={
            <img
              src="/media/imgs/dad-and-kid-labeling.webp"
              alt="Father and daughter making GoodCup"
              className="rounded-2xl animate-fade-scale"

            />
          }
          text="Goodcup is a family-made drink, created by a dad and his daughter who love making things that feel good in the body. We started mixing and testing ingredients in our kitchen—not for a brand, but for ourselves. What came out of it was something that tasted great, boosted clarity, and supported energy without the crash. Once we started sharing it, friends kept coming back asking for more."
          bgColor="bg-transparent"
        />

        {/* Second section: text left, image right */}
        <Section

          text="It isn’t just a morning fix—it’s an anytime boost. Whether it’s your pre-workout, afternoon pick-me-up, or evening focus tool, Goodcup meets you where you are. We believe in it because we use it every day, and we’ve seen what it does. Clean, balanced, and made to support real life—that’s what we’re here for."
          
          bgColor="bg-transparent"
          textColor="text-white"
        />
        
      </div>
    </Layout>
  );
}
