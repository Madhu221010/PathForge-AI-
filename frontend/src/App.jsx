import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Upload,
  UserRound,
  BriefcaseBusiness
} from "lucide-react";

const API = "http://localhost:5000/api";

const initialForm = {
  targetRole: "",
  currentSkills: "",
  interests: "",
  resumeText: ""
};

function splitList(value) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [form, setForm] = useState(initialForm);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = ["welcome", "goal", "skills", "interests", "generate", "dashboard"];
  const currentStep = Math.max(0, steps.indexOf(screen));

  async function uploadResume(file) {
    if (!file) return;
    setError("");

    const data = new FormData();
    data.append("resume", file);

    try {
      const response = await fetch(`${API}/resume/text`, {
        method: "POST",
        body: data
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setForm((prev) => ({ ...prev, resumeText: result.text }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateRoadmap() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/roadmaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: form.targetRole,
          currentSkills: splitList(form.currentSkills),
          interests: splitList(form.interests),
          resumeText: form.resumeText
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setRoadmap(result);
      localStorage.setItem("pathforge-roadmap", JSON.stringify(result));
      setScreen("dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goBack() {
    const previous = {
      goal: "welcome",
      skills: "goal",
      interests: "skills",
      generate: "interests",
      dashboard: "generate"
    };
    if (previous[screen]) setScreen(previous[screen]);
  }

  function toggleMilestone(index) {
    const milestones = [...roadmap.analysis.milestones];
    milestones[index] = {
      ...milestones[index],
      completed: !milestones[index].completed
    };

    const next = {
      ...roadmap,
      analysis: { ...roadmap.analysis, milestones }
    };

    setRoadmap(next);
    localStorage.setItem("pathforge-roadmap", JSON.stringify(next));
  }

  const progress = useMemo(() => {
    if (!roadmap?.analysis?.milestones?.length) return 0;
    const done = roadmap.analysis.milestones.filter((m) => m.completed).length;
    return Math.round((done / roadmap.analysis.milestones.length) * 100);
  }, [roadmap]);

  if (screen === "welcome") {
    return (
      <div className="app-shell centered">
        <div className="hero-card">
          <div className="logo"><Sparkles size={20} /> PathForge AI</div>
          <div className="hero-icon"><Target size={42} /></div>
          <p className="eyebrow">YOUR PERSONAL CAREER COMPASS</p>
          <h1>Build a career path<br />that fits <span>you.</span></h1>
          <p className="muted hero-copy">
            Tell us where you want to go and what you already know.
            PathForge turns your skills, interests and experience into a personalized roadmap.
          </p>
          <button className="primary-btn large" onClick={() => setScreen("goal")}>
            Start My Journey <ArrowRight size={19} />
          </button>
          <div className="mini-features">
            <span><Sparkles size={15} /> AI-powered</span>
            <span><Target size={15} /> Personalized</span>
            <span><BriefcaseBusiness size={15} /> Project-focused</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "goal") {
    return (
      <Wizard
        step={1}
        title="What's your career goal?"
        subtitle="Choose the role you're working toward."
        onBack={goBack}
      >
        <div className="role-grid">
          {["Frontend Developer", "Backend Developer", "Data Analyst", "UI/UX Designer", "AI / ML Engineer", "Cybersecurity Analyst"].map((role) => (
            <button
              key={role}
              className={`choice-card ${form.targetRole === role ? "selected" : ""}`}
              onClick={() => updateField("targetRole", role)}
            >
              <BriefcaseBusiness size={21} />
              <span>{role}</span>
            </button>
          ))}
        </div>

        <label className="label">Or enter your own role</label>
        <input
          className="input"
          placeholder="e.g. Full Stack Developer"
          value={form.targetRole}
          onChange={(e) => updateField("targetRole", e.target.value)}
        />

        <BottomButton disabled={!form.targetRole.trim()} onClick={() => setScreen("skills")}>
          Continue
        </BottomButton>
      </Wizard>
    );
  }

  if (screen === "skills") {
    return (
      <Wizard
        step={2}
        title="What do you know already?"
        subtitle="Separate skills with commas. This helps us find your gaps."
        onBack={goBack}
      >
        <label className="label">Current skills</label>
        <textarea
          className="textarea"
          rows="5"
          placeholder="HTML, CSS, JavaScript, Git..."
          value={form.currentSkills}
          onChange={(e) => updateField("currentSkills", e.target.value)}
        />

        <div className="upload-box">
          <div className="upload-icon"><Upload size={21} /></div>
          <div>
            <strong>Upload your resume</strong>
            <p className="muted small">PDF or TXT, up to 5 MB</p>
          </div>
          <label className="secondary-btn">
            Browse
            <input type="file" accept=".pdf,.txt,application/pdf,text/plain" hidden onChange={(e) => uploadResume(e.target.files[0])} />
          </label>
        </div>

        {form.resumeText && (
          <div className="success-note">
            <FileText size={17} /> Resume text extracted successfully.
          </div>
        )}

        <BottomButton onClick={() => setScreen("interests")}>Continue</BottomButton>
      </Wizard>
    );
  }

  if (screen === "interests") {
    return (
      <Wizard
        step={3}
        title="What are you interested in?"
        subtitle="Your interests help PathForge personalize projects and resources."
        onBack={goBack}
      >
        <label className="label">Interests</label>
        <textarea
          className="textarea"
          rows="5"
          placeholder="Web development, AI, design, startups..."
          value={form.interests}
          onChange={(e) => updateField("interests", e.target.value)}
        />

        <div className="interest-chips">
          {["AI", "Web Development", "Design", "Data", "Cybersecurity", "Entrepreneurship"].map((interest) => (
            <button
              key={interest}
              className={`chip ${form.interests.toLowerCase().includes(interest.toLowerCase()) ? "active" : ""}`}
              onClick={() => {
                const list = splitList(form.interests);
                if (!list.includes(interest)) updateField("interests", [...list, interest].join(", "));
              }}
            >
              {interest}
            </button>
          ))}
        </div>

        <BottomButton onClick={() => setScreen("generate")}>Review & Generate</BottomButton>
      </Wizard>
    );
  }

  if (screen === "generate") {
    return (
      <Wizard
        step={4}
        title="Ready to forge your path?"
        subtitle="We'll analyze your profile and create your personalized roadmap."
        onBack={goBack}
      >
        <div className="summary-card">
          <SummaryRow icon={<BriefcaseBusiness />} label="Target role" value={form.targetRole} />
          <SummaryRow icon={<GraduationCap />} label="Current skills" value={form.currentSkills || "Not provided"} />
          <SummaryRow icon={<Lightbulb />} label="Interests" value={form.interests || "Not provided"} />
          <SummaryRow icon={<FileText />} label="Resume" value={form.resumeText ? "Uploaded" : "Not uploaded"} />
        </div>

        {error && <div className="error-note">{error}</div>}

        <button className="primary-btn large full" onClick={generateRoadmap} disabled={loading}>
          {loading ? <><Loader2 className="spin" size={19} /> Analyzing your profile...</> : <><Sparkles size={19} /> Generate My Roadmap</>}
        </button>
      </Wizard>
    );
  }

  if (screen === "dashboard" && roadmap) {
    return (
      <div className="dashboard-shell">
        <header className="topbar">
          <div className="logo"><Sparkles size={19} /> PathForge AI</div>
          <div className="topbar-user"><UserRound size={18} /> Your Roadmap</div>
        </header>

        <main className="dashboard">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR PERSONALIZED PATH</p>
              <h1>Become a {roadmap.targetRole}</h1>
              <p className="muted">{roadmap.analysis.summary}</p>
            </div>
            <div className="score-card">
              <div className="score">{roadmap.analysis.readinessScore}%</div>
              <span>Readiness</span>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel">
              <PanelTitle icon={<Target />} title="Skill Detection" />
              <div className="skill-list">
                {roadmap.analysis.strengths?.map((skill) => (
                  <div className="skill strength" key={skill}><CheckCircle2 size={17} /> {skill}</div>
                ))}
                {roadmap.analysis.skillGaps?.map((gap) => (
                  <div className="skill gap" key={gap.skill}>
                    <Circle size={15} />
                    <div><strong>{gap.skill}</strong><small>{gap.reason}</small></div>
                    <span className={`priority ${gap.priority.toLowerCase()}`}>{gap.priority}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <PanelTitle icon={<LayoutDashboard />} title="Progress" />
              <div className="progress-number">{progress}%</div>
              <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
              <p className="muted small">Complete milestones as you move through your roadmap.</p>
              <div className="milestones">
                {roadmap.analysis.milestones?.map((m, i) => (
                  <button className={`milestone ${m.completed ? "done" : ""}`} key={m.title} onClick={() => toggleMilestone(i)}>
                    {m.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    {m.title}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <PanelTitle icon={<GraduationCap />} title="Your Learning Roadmap" />
            <div className="roadmap">
              {roadmap.analysis.roadmap?.map((phase) => (
                <div className="phase" key={phase.phase}>
                  <div className="phase-number">{phase.phase}</div>
                  <div className="phase-content">
                    <div className="phase-head">
                      <div><h3>{phase.title}</h3><span className="muted small">{phase.duration}</span></div>
                    </div>
                    <ul>
                      {phase.tasks?.map((task) => <li key={task}>{task}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel">
              <PanelTitle icon={<FileText />} title="Recommended Resources" />
              <div className="resource-list">
                {roadmap.analysis.resources?.map((resource) => (
                  <a className="resource" href={resource.url} target="_blank" rel="noreferrer" key={resource.title}>
                    <div><strong>{resource.title}</strong><small>{resource.type}</small></div>
                    <ArrowRight size={17} />
                  </a>
                ))}
              </div>
            </div>

            <div className="panel">
              <PanelTitle icon={<Lightbulb />} title="Portfolio Projects" />
              {roadmap.analysis.projects?.map((project) => (
                <div className="project-card" key={project.title}>
                  <div className="project-top"><strong>{project.title}</strong><span>{project.difficulty}</span></div>
                  <p className="muted small">{project.description}</p>
                  <div className="tag-row">{project.skills?.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
                </div>
              ))}
            </div>
          </section>

          <button className="secondary-btn new-btn" onClick={() => {
            setRoadmap(null);
            setForm(initialForm);
            setScreen("goal");
          }}>Create Another Roadmap</button>
        </main>
      </div>
    );
  }

  return null;
}

function Wizard({ step, title, subtitle, onBack, children }) {
  return (
    <div className="app-shell">
      <header className="wizard-topbar">
        <button className="icon-btn" onClick={onBack}><ChevronLeft size={21} /></button>
        <div className="logo"><Sparkles size={18} /> PathForge AI</div>
        <span className="step-count">Step {step} of 4</span>
      </header>

      <div className="wizard-progress"><span style={{ width: `${(step / 4) * 100}%` }} /></div>

      <main className="wizard-content">
        <div className="wizard-card">
          <div className="step-icon"><Sparkles size={22} /></div>
          <p className="eyebrow">PATHFORGE SETUP</p>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          <div className="wizard-body">{children}</div>
        </div>
      </main>
    </div>
  );
}

function BottomButton({ children, disabled, onClick }) {
  return <button className="primary-btn large full" disabled={disabled} onClick={onClick}>{children}<ArrowRight size={18} /></button>;
}

function SummaryRow({ icon, label, value }) {
  return (
    <div className="summary-row">
      <div className="summary-icon">{icon}</div>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

function PanelTitle({ icon, title }) {
  return <div className="panel-title"><span>{icon}</span><h2>{title}</h2></div>;
}
