import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

const projectShowcases = {
  quizcard: {
    url: "/showcase/quizcard.html",
    title: "AI QuizCard",
  },
  opencheck: {
    url: "/showcase/opencheck.html",
    title: "OpenCheck",
  },
};

const AboutProjectPage = () => {
  const { projectId } = useParams();
  const showcase = projectShowcases[projectId];
  const showcaseUrl = showcase?.url;

  useEffect(() => {
    if (showcaseUrl) {
      window.location.replace(showcaseUrl);
    }
  }, [showcaseUrl]);

  if (!showcaseUrl) {
    return <Navigate to="/about" replace />;
  }

  return (
    <section className="about-project-page" aria-label="正在打开项目页面">
      <div className="about-project-shell">
        <a className="about-project-action" href={showcaseUrl}>
          正在打开 {showcase.title} 项目页
        </a>
      </div>
    </section>
  );
};

export default AboutProjectPage;
