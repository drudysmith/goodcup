import Layout from '../components/Layout';
import Section from '../components/Section';

const IMAGE_1 = "https://res.cloudinary.com/drtaph2gu/image/upload/v1747867465/IMG_5638_rtfx3c.webp";
const IMAGE_2 = "https://res.cloudinary.com/drtaph2gu/image/upload/v1712345678/goodcup-mid.jpg";

export default function About() {
  return (
    <Layout>
      <div className="site-section-bg -mt-[120px] pt-[120px]">

        {/* First section: image left, text right */}
        <Section
          title="About GoodCup"
          media={<img src={IMAGE_1} alt="Father and daughter making GoodCup" />}
          text="GoodCup is a father-daughter cottage creation, handcrafted in our home kitchen with real attention, real intention, and a lot of care. What began as a personal blend — a tea made to support clear, steady focus and deep calm — gradually evolved into something we felt ready to share. We're not a beverage company with a branding team. We're two humans with a shared rhythm, working side-by-side to fill and ship every tin with the same care we'd want if it were arriving at our own door."
          bgColor="bg-transparent"
        />

        {/* Second section: text only, wider and centered */}
        <Section
          title=""
          text="I was never a coffee drinker. The jittery spike just never matched what I needed. What I wanted was clarity and grounded energy — a slow, present alertness that doesn't overstimulate but opens up space. After years of experimenting, refining, and paying attention to the way different ingredients work on the body and mind, the GoodCup blend emerged: a gently energizing, subtly nourishing tea that supports both immediate presence and long-term vitality."
          media={null}
          bgColor="bg-transparent"
        />

        {/* Third section: text left, image right */}
        <Section
          title=""
          text="We sometimes show up at farmers markets to connect in person, but most days you'll find us at the kitchen table, filling orders by hand and feeling grateful to offer something that helps people feel more alive, more centered. We hope GoodCup becomes part of a ritual you look forward to — a moment of grounding that meets you right where you are."
          media={<img src={IMAGE_2} alt="GoodCup blend ingredients" />}
          bgColor="bg-transparent"
        />
        
      </div>
    </Layout>
  );
}