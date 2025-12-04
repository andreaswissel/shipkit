"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Modal,
  Preview,
} from "@/components";

interface GeneratedFile {
  path: string;
  content: string;
}

interface ShipResult {
  success: boolean;
  files: GeneratedFile[];
  errors?: string[];
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  components?: string[];
}

type ViewTab = "code" | "preview";

interface TestUser {
  id: string;
  email: string;
  roles: string[];
}

const AVAILABLE_ROLES = ["admin", "developer", "viewer"];

export default function Home() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null);
  const [discoveredComponents, setDiscoveredComponents] = useState<string[]>(
    []
  );
  const [discovering, setDiscovering] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("preview");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [testUser, setTestUser] = useState<TestUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userEmail, setUserEmail] = useState("test@example.com");
  const [userRoles, setUserRoles] = useState<string[]>(["developer"]);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/discover");
      const data = await res.json();
      setDiscoveredComponents(data.components || []);
    } catch (err) {
      console.error("Discovery failed:", err);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setSelectedFileIndex(0);

    try {
      const res = await fetch("/api/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          requirements: requirements.split("\n").filter(Boolean),
          acceptanceCriteria: acceptanceCriteria.split("\n").filter(Boolean),
          user: testUser,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        files: [],
        errors: [err instanceof Error ? err.message : "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetUser = () => {
    setTestUser({
      id: `user-${Date.now()}`,
      email: userEmail,
      roles: userRoles,
    });
    setShowUserModal(false);
  };

  const handleClearUser = () => {
    setTestUser(null);
  };

  const toggleRole = (role: string) => {
    setUserRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const selectedFile = result?.files[selectedFileIndex];
  const componentName = selectedFile?.path
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "");

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "8px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ShipKit Test Bench
        </h1>
        <p style={{ color: "#888" }}>
          AI-powered frontend feature generation
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "400px 1fr",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Describe Your Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <Input
                  label="Feature Name"
                  placeholder="e.g., User Profile Dashboard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Textarea
                  label="Description"
                  placeholder="Describe what this feature should do..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{ minHeight: "60px" }}
                />

                <Textarea
                  label="Requirements (one per line)"
                  placeholder="- Display user info&#10;- Show stats&#10;- Allow editing"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  required
                  style={{ minHeight: "80px" }}
                />

                <Textarea
                  label="Acceptance Criteria (optional)"
                  placeholder="- User can update profile&#10;- Changes saved"
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  style={{ minHeight: "60px" }}
                />

                <div style={{ display: "flex", gap: "12px" }}>
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={!name || !description || !requirements}
                    style={{ flex: 1 }}
                  >
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscover}
                    disabled={discovering}
                  >
                    {discovering ? "..." : "Discover"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Test User</CardTitle>
            </CardHeader>
            <CardContent>
              {testUser ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "14px" }}>
                    <div style={{ color: "#ededed", marginBottom: "4px" }}>
                      {testUser.email}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {testUser.roles.map((role) => (
                        <span
                          key={role}
                          style={{
                            padding: "2px 8px",
                            backgroundColor:
                              role === "admin"
                                ? "rgba(239, 68, 68, 0.2)"
                                : role === "developer"
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(156, 163, 175, 0.2)",
                            color:
                              role === "admin"
                                ? "#f87171"
                                : role === "developer"
                                  ? "#60a5fa"
                                  : "#9ca3af",
                            borderRadius: "4px",
                            fontSize: "12px",
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUserModal(true)}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearUser}>
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", marginBottom: "12px" }}>
                    No user set. Auth will be skipped.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUserModal(true)}
                  >
                    Set User
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {discoveredComponents.length > 0 && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>
                  Components ({discoveredComponents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {discoveredComponents.map((comp) => (
                    <span
                      key={comp}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "#333",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: result.success
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    marginBottom: result.errors?.length ? "12px" : 0,
                  }}
                >
                  <span style={{ fontSize: "18px" }}>
                    {result.success ? "✓" : "✗"}
                  </span>
                  <span
                    style={{ color: result.success ? "#22c55e" : "#ef4444" }}
                  >
                    {result.success ? "Success!" : "Failed"}
                  </span>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div style={{ fontSize: "13px", color: "#ef4444" }}>
                    {result.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                {result.validation?.warnings &&
                  result.validation.warnings.length > 0 && (
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#f59e0b",
                        marginTop: "8px",
                      }}
                    >
                      {result.validation.warnings.map((warn, i) => (
                        <div key={i}>⚠ {warn}</div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card variant="outlined" style={{ minHeight: "600px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "1px solid #333",
            }}
          >
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => setActiveTab("preview")}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    activeTab === "preview" ? "#3b82f6" : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  color: activeTab === "preview" ? "#fff" : "#888",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    activeTab === "code" ? "#3b82f6" : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  color: activeTab === "code" ? "#fff" : "#888",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Code
              </button>
            </div>

            {result && result.files.length > 1 && (
              <select
                value={selectedFileIndex}
                onChange={(e) => setSelectedFileIndex(Number(e.target.value))}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#ededed",
                  fontSize: "13px",
                  fontFamily: "monospace",
                }}
              >
                {result.files.map((file, i) => (
                  <option key={file.path} value={i}>
                    {file.path.split("/").pop()}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ padding: "20px", height: "calc(100% - 60px)" }}>
            {!result && !loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#666",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    🚀
                  </div>
                  <p>Describe a feature to see the generated UI</p>
                </div>
              </div>
            )}

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "3px solid #333",
                      borderTopColor: "#3b82f6",
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <p style={{ color: "#888" }}>Generating...</p>
                </div>
              </div>
            )}

            {result && result.files.length > 0 && selectedFile && (
              <>
                {activeTab === "preview" && (
                  <Preview
                    code={selectedFile.content}
                    componentName={componentName || "Component"}
                  />
                )}

                {activeTab === "code" && (
                  <div style={{ height: "100%", position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        zIndex: 1,
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewFile(selectedFile)}
                      >
                        Expand
                      </Button>
                    </div>
                    <pre
                      style={{
                        backgroundColor: "#0a0a0a",
                        padding: "16px",
                        borderRadius: "8px",
                        overflow: "auto",
                        height: "100%",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {selectedFile.content}
                    </pre>
                  </div>
                )}
              </>
            )}

            {result && result.files.length === 0 && !result.success && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#ef4444",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    ⚠️
                  </div>
                  <p>Generation failed - check errors</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.path}
        size="lg"
      >
        <pre
          style={{
            backgroundColor: "#0a0a0a",
            padding: "16px",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "60vh",
            fontSize: "14px",
            fontFamily: "monospace",
            lineHeight: 1.5,
          }}
        >
          {previewFile?.content}
        </pre>
      </Modal>

      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Configure Test User"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "#ededed",
                marginBottom: "8px",
              }}
            >
              Roles
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {AVAILABLE_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: userRoles.includes(role)
                      ? "1px solid #3b82f6"
                      : "1px solid #333",
                    backgroundColor: userRoles.includes(role)
                      ? "rgba(59, 130, 246, 0.2)"
                      : "transparent",
                    color: userRoles.includes(role) ? "#60a5fa" : "#888",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              admin: ship, deploy, rollback | developer: ship | viewer: none
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <Button onClick={handleSetUser} style={{ flex: 1 }}>
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowUserModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
