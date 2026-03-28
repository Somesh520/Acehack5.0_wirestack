import { useState } from 'react';

const highlights = [
    { title: 'Fast Setup', desc: 'Launch your product page with clean information hierarchy.' },
    { title: 'Conversion First', desc: 'Every section is focused on trust and clear action.' },
    { title: 'MVP Ready', desc: 'Simple structure, strong visuals, and easy iteration.' }
];

const testimonials = [
    { quote: 'Looks premium while still feeling straightforward.', name: 'Sanya, Founder' },
    { quote: 'The layout feels bold and easy to scan.', name: 'Ishaan, PM' },
    { quote: 'Finally a generated site that does not look generic.', name: 'Naman, Developer' }
];

const faqs = [
    { q: 'Is this design production friendly?', a: 'Yes. It is a practical MVP structure with clean reusable sections.' },
    { q: 'Can I customize sections quickly?', a: 'Absolutely. All blocks are modular and easy to edit.' },
    { q: 'Does this work on mobile?', a: 'Yes. The layout is responsive with smooth scrolling behavior.' }
];

export default function App() {
    const [openFaq, setOpenFaq] = useState(0);

    return (
        <div className="page" id="top">
            <header className="hero section">
                <p className="eyebrow">Neo-Brutalism MVP</p>
                <h1>Build Bold Pages That Convert</h1>
                <p className="lead">Idea in focus: {{idea}}. This is a clean, generic, smooth-scrolling product website with a strong neo-brutalist visual system.</p>
                <div className="hero-actions">
                    <a className="btn btn-primary" href="#highlights">Explore Features</a>
                    <a className="btn btn-ghost" href="#contact">Get Started</a>
                </div>
            </header>

            <section id="highlights" className="section demo">
                <h2>Core Highlights</h2>
                <div className="grid three">
                    {highlights.map((item) => (
                        <article key={item.title} className="card">
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section">
                <h2>How It Flows</h2>
                <div className="grid four">
                    <div className="pill">01. Discover</div>
                    <div className="pill">02. Compare</div>
                    <div className="pill">03. Decide</div>
                    <div className="pill">04. Launch</div>
                </div>
            </section>

            <section className="section trust">
                <h2>What Our Customers Say</h2>
                <div className="grid three">
                    {testimonials.map((item) => (
                        <article key={item.name} className="card quote">
                            <p>"{item.quote}"</p>
                            <h4>{item.name}</h4>
                        </article>
                    ))}
                </div>
            </section>

            <section id="contact" className="section faq">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-list">
                    {faqs.map((item, i) => (
                        <article key={item.q} className="faq-item">
                            <button className="faq-q" onClick={() => setOpenFaq(i === openFaq ? -1 : i)}>{item.q}</button>
                            {openFaq === i ? <p className="faq-a">{item.a}</p> : null}
                        </article>
                    ))}
                </div>
                <a className="btn btn-primary" href="#top">Back to Top</a>
            </section>
        </div>
    );
}
