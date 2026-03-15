import { useState } from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "../components/Tooltip";

export default function Help() {
  const { t } = useTranslation("help");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("gettingStarted");

  const sections = [
    { id: "gettingStarted", title: t("sections.gettingStarted.title"), icon: "🚀" },
    { id: "chat", title: t("sections.chat.title"), description: t("sections.chat.description"), icon: "💬" },
    { id: "quiz", title: t("sections.quiz.title"), description: t("sections.quiz.description"), icon: "📝" },
    { id: "flashcards", title: t("sections.flashcards.title"), description: t("sections.flashcards.description"), icon: "🎴" },
    { id: "tools", title: t("sections.tools.title"), description: t("sections.tools.description"), icon: "🛠️" },
    { id: "planner", title: t("sections.planner.title"), description: t("sections.planner.description"), icon: "📅" },
  ];

  const faqs = [
    { id: "howToStart", question: t("faq.howToStart.question"), answer: t("faq.howToStart.answer") },
    { id: "changeLanguage", question: t("faq.changeLanguage.question"), answer: t("faq.changeLanguage.answer") },
    { id: "exportNotes", question: t("faq.exportNotes.question"), answer: t("faq.exportNotes.answer") },
    { id: "shareProgress", question: t("faq.shareProgress.question"), answer: t("faq.shareProgress.answer") },
    { id: "contactSupport", question: t("faq.contactSupport.question"), answer: t("faq.contactSupport.answer") },
  ];

  const filteredContent = () => {
    if (!searchQuery.trim()) return { sections, faqs };

    const query = searchQuery.toLowerCase();
    const filteredSections = sections.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.description?.toLowerCase().includes(query)
    );
    const filteredFaqs = faqs.filter(faq =>
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );

    return { sections: filteredSections, faqs: filteredFaqs };
  };

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-sky-500/30 text-sky-300 rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const { sections: filteredSections, faqs: filteredFaqs } = filteredContent();

  return (
    <div className="min-h-screen bg-black text-stone-300 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">{t("title")}</h1>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search")}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 pl-12 text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
        </div>

        {/* No Results */}
        {searchQuery && filteredSections.length === 0 && filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-lg mb-2">{t("noResults")}</p>
            <p className="text-stone-600">{t("tryDifferentKeywords")}</p>
          </div>
        )}

        {/* Getting Started */}
        {!searchQuery && (
          <div className="mb-12 bg-stone-950/50 border border-stone-800 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              {t("sections.gettingStarted.title")}
            </h2>
            <div className="space-y-6">
              {[
                { num: "1", title: t("sections.gettingStarted.steps.1.title"), desc: t("sections.gettingStarted.steps.1.description") },
                { num: "2", title: t("sections.gettingStarted.steps.2.title"), desc: t("sections.gettingStarted.steps.2.description") },
                { num: "3", title: t("sections.gettingStarted.steps.3.title"), desc: t("sections.gettingStarted.steps.3.description") },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-semibold">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-stone-200 mb-1">{step.title}</h3>
                    <p className="text-stone-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {filteredSections.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("features.title")}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-stone-950/50 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <div>
                      <h3 className="text-lg font-medium text-stone-200">
                        {highlightText(section.title)}
                      </h3>
                      {section.description && (
                        <p className="text-stone-400 mt-1">{highlightText(section.description)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {filteredFaqs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("faq.title")}</h2>
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-stone-950/50 border border-stone-800 rounded-xl p-5"
                >
                  <h3 className="text-lg font-medium text-stone-200 mb-2">
                    {highlightText(faq.question)}
                  </h3>
                  <p className="text-stone-400">{highlightText(faq.answer)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-12 pt-8 border-t border-stone-800">
          <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-6 text-center">
            <p className="text-stone-400 mb-4">{t("faq.contactSupport.answer")}</p>
            <a
              href="mailto:support@pagelm.com"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {t("contactSupport")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
