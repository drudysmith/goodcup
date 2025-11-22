import Image from "next/image";
import Head from "next/head";

export default function Promo() {
  return (
    <>
      <Head>
        <title>Goodcup Promo</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          Goodcup Promo
        </h1>
        <h2 style={{ marginBottom: "1rem", textAlign: "center", fontWeight: 500 }}>
          take your pick
        </h2>

        <div className="cards">
          <div className="card">
            <a href="https://buy.stripe.com/8x2bJ26sAbQ631fev9bEA01?prefilled_promo_code=market10">
              <Image
                src="/media/payment_link_imgs/sweet_goodcup.png"
                alt="Sweet Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/8x2bJ26sAbQ631fev9bEA01?prefilled_promo_code=market10"
            >
              Sweet Goodcup
            </a>
          </div>

          <div className="card">
            <a href="https://buy.stripe.com/00w9AUdV2bQ66dr72HbEA02?prefilled_promo_code=market10">
              <Image
                src="/media/payment_link_imgs/daily_goodcup.png"
                alt="Daily Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/00w9AUdV2bQ66dr72HbEA02?prefilled_promo_code=market10"
            >
              Daily Goodcup
            </a>
          </div>

          <div className="card">
            <a href="https://buy.stripe.com/dRm5kE7wEbQ66draeTbEA03?prefilled_promo_code=market10">
              <Image
                src="/media/payment_link_imgs/fire_goodcup.png"
                alt="Fire Goodcup"
                width={600}
                height={600}
                style={{ width: "100%", height: "auto", maxWidth: 280 }}
              />
            </a>
            <a
              className="name"
              href="https://buy.stripe.com/dRm5kE7wEbQ66draeTbEA03?prefilled_promo_code=market10"
            >
              Fire Goodcup
            </a>
          </div>
        </div>
      </main>
      <style jsx>{`
        .cards {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }
        .card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .name {
          margin-top: 0.5rem;
          font-weight: 600;
          text-decoration: none;
          color: inherit;
        }
        .name:hover {
          text-decoration: underline;
        }
        @media (min-width: 768px) {
          .cards {
            flex-direction: row;
            justify-content: center;
            gap: 2rem;
          }
        }
      `}</style>
    </>
  );
}


