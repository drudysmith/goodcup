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

        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <a href="https://example1.com">First link</a>
            <a href="https://example2.com">Second link</a>
            <a href="https://example3.com">Third link</a>
          </div>
        </div>

        <input
          type="text"
          placeholder="Type something…"
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "0.75rem",
            fontSize: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
          }}
        />
      </main>
    </>
  );
}


