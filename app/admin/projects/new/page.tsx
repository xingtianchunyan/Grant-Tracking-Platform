"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { FormField } from "@/components/forms/form-field"

function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAutoFilled, setIsAutoFilled] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    creatorUsername: "",
    granteeEmail: "",
    background: "",
    missionExpertise: "",
    campaignGoals: "",
    fundingRequested: "",
    fundingCurrency: "USD",
    fundingDetails: [{ amount: "", currency: "USD" }] as { amount: string; currency: string }[],
    githubRepo: "",
    proposalLink: "",
    websiteLinks: "",
    programType: "",
    category: "",
    duration: "",
    creatorStat1Name: "",
    creatorStat1Number: "",
    creatorStat2Name: "",
    creatorStat2Number: "",
    youtubeLink: "",
    tiktokLink: "",
    twitterLink: "",
    twitchLink: "",
  })

  useEffect(() => {
    const tempId = searchParams.get("tempId")

    if (tempId) {
      /**
       * fetchAndAnalyze
       * 功能描述：从 Discord 临时消息中获取内容，并调用 AI 接口提取项目信息，最后自动填充到表单中。
       * 
       * @async
       * @function fetchAndAnalyze
       * @returns {Promise<void>}
       * @throws {Error} - 当获取消息内容或 AI 提取失败时抛出异常
       */
      async function fetchAndAnalyze() {
        // 设置正在分析的状态，触发 UI 上的加载动画
        setIsAnalyzing(true);
        try {
            // 步骤 1: 获取 Discord 临时消息的内容
            // 使用从 URL 参数中获取的 tempId 进行查询
            const msgRes = await fetch(`/api/discord/temp-message/${tempId}`);
            // 如果请求失败（如消息已过期或不存在），抛出错误
            if (!msgRes.ok) throw new Error("Failed to fetch message content");
            
            // 解析返回的消息数据
            const msgData = await msgRes.json();
            // 提取消息正文内容
            const content = msgData.content;

            // 步骤 2: 调用 AI 提取接口
            // 将获取到的 Discord 消息内容发送给后端的 AI 处理路由
            const aiRes = await fetch("/api/ai/extract-project-info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content })
            });
            
            // 获取 AI 提取出的结构化数据
            const extracted = await aiRes.json();
            // 如果后端返回错误（如 AI 模型调用失败），则抛出具体的错误信息
            if (!aiRes.ok) throw new Error(extracted.error || "AI extraction failed");

            // 步骤 3: 将 AI 提取的数据填充到表单状态中
            setFormData(prev => ({
                ...prev,
                // 如果 AI 提取到了对应字段，则覆盖现有值；否则保持原样
                title: extracted.projectName || prev.title,
                background: extracted.projectDescription || prev.background,
                // 金额需要转换为字符串以匹配输入框类型
                fundingRequested: extracted.fundingRequested ? String(extracted.fundingRequested) : prev.fundingRequested,
                fundingCurrency: extracted.fundingCurrency || prev.fundingCurrency,
                fundingDetails: extracted.fundingDetails && extracted.fundingDetails.length > 0 
                  ? extracted.fundingDetails.map((d: any) => ({ amount: String(d.amount), currency: d.currency }))
                  : [{ amount: extracted.fundingRequested ? String(extracted.fundingRequested) : "", currency: extracted.fundingCurrency || "USD" }],
                category: extracted.category || prev.category,
                programType: extracted.programType || prev.programType,
                duration: extracted.duration || prev.duration,
                githubRepo: extracted.githubRepo || prev.githubRepo,
                proposalLink: extracted.proposalLink || prev.proposalLink,
                granteeEmail: extracted.granteeEmail || prev.granteeEmail,
                missionExpertise: extracted.missionExpertise || prev.missionExpertise,
                campaignGoals: extracted.campaignGoals || prev.campaignGoals,
                // 如果 AI 没有提取到作者信息，尝试从 Discord 消息元数据中获取
                creatorUsername: msgData.metadata?.author || "",
            }));

            // 标记为已自动填充，以便在 UI 上进行视觉反馈
            setIsAutoFilled(true);
            // 弹出成功提示
            toast({
                title: "AI Analysis Complete",
                description: "Form has been auto-filled from the Discord message.",
            });

        } catch (error: any) {
            // 记录自动填充过程中的错误
            console.error("Auto-fill error:", error);
            // 弹出失败提示，显示具体错误原因
            toast({
                title: "Auto-fill Failed",
                description: error.message || "Could not automatically extract project info. Please fill manually.",
                variant: "destructive"
            });
        } finally {
            // 无论成功或失败，都关闭加载状态
            setIsAnalyzing(false);
        }
      }

      fetchAndAnalyze();
    }
  }, [searchParams, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFundingDetailChange = (index: number, field: "amount" | "currency", value: string) => {
    setFormData((prev) => {
      const newDetails = [...prev.fundingDetails]
      const existingDetail = newDetails[index]
      if (!existingDetail) return prev

      const detail = {
        amount: field === "amount" ? value : existingDetail.amount,
        currency: field === "currency" ? value : existingDetail.currency,
      }
      newDetails[index] = detail
      return { ...prev, fundingDetails: newDetails }
    })
  }

  const addFundingDetail = () => {
    setFormData((prev) => ({
      ...prev,
      fundingDetails: [...prev.fundingDetails, { amount: "", currency: "USD" }],
    }))
  }

  const removeFundingDetail = (index: number) => {
    setFormData((prev) => {
      if (prev.fundingDetails.length <= 1) return prev
      const newDetails = [...prev.fundingDetails]
      newDetails.splice(index, 1)
      return { ...prev, fundingDetails: newDetails }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.title,
          description: formData.background,
          github_repo: formData.githubRepo,
          proposal_link: formData.proposalLink,
          discord_channel: formData.creatorUsername,
          funding_amount: Number.parseFloat(formData.fundingRequested) || 0,
          funding_currency: formData.fundingCurrency,
          funding_details: formData.fundingDetails
            .filter(d => d.amount)
            .map(d => ({ amount: Number.parseFloat(d.amount), currency: d.currency })),
          start_date: new Date().toISOString().split("T")[0],
          end_date: null,
          creator_username: formData.creatorUsername,
          grantee_email: formData.granteeEmail,
          mission_expertise: formData.missionExpertise,
          campaign_goals: formData.campaignGoals,
          website_links: formData.websiteLinks,
          program_type: formData.programType,
          category: formData.category,
          duration: formData.duration,
          creator_stat_1_name: formData.creatorStat1Name,
          creator_stat_1_number: formData.creatorStat1Number ? Number.parseInt(formData.creatorStat1Number) : null,
          creator_stat_2_name: formData.creatorStat2Name,
          creator_stat_2_number: formData.creatorStat2Number ? Number.parseInt(formData.creatorStat2Number) : null,
          youtube_link: formData.youtubeLink,
          tiktok_link: formData.tiktokLink,
          twitter_link: formData.twitterLink,
          twitch_link: formData.twitchLink,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const project = await response.json()

      toast({
        title: "Project Created",
        description: `${formData.title} has been successfully created.`,
      })

      if (project && project.id) {
        const tempId = searchParams.get("tempId")
        const redirectUrl = `/admin/projects/${project.id}/milestones/new${tempId ? `?tempId=${tempId}` : ""}`
        router.push(redirectUrl)
      } else {
        console.error("Project created but no ID returned:", project);
        toast({
          title: "Redirection Error",
          description: "Project was created but we couldn't redirect you. Please check the projects list.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin" className="flex items-center gap-2 text-white hover:text-[#10c0dd] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className={`bg-card/80 backdrop-blur-sm border-border/50 ${isAutoFilled ? 'ring-2 ring-[#10c0dd]' : ''}`}>
              <CardHeader>
                <CardTitle className="text-white text-2xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-[#10c0dd]" />
                  Create New Project
                </CardTitle>
                <p className="text-muted-foreground">
                  Fill out the form below to create a new grant project. All fields marked with * are required.
                  {isAnalyzing && <span className="text-[#10c0dd] flex items-center gap-2 mt-1"><Loader2 className="w-4 h-4 animate-spin"/> Analyzing Discord message...</span>}
                  {!isAnalyzing && isAutoFilled && <span className="text-[#10c0dd] block mt-1">✨ Data auto-filled by AI</span>}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormField
                    id="title"
                    label="Project Title"
                    value={formData.title}
                    onChange={(value) => handleInputChange("title", value)}
                    placeholder="Enter project title"
                    required
                  />

                  <FormField
                    id="creatorUsername"
                    label="Creator Username (Discord)"
                    value={formData.creatorUsername}
                    onChange={(value) => handleInputChange("creatorUsername", value)}
                    placeholder="Discord username for authentication"
                    required
                  />

                  <FormField
                    id="granteeEmail"
                    label="Grantee Email"
                    type="email"
                    value={formData.granteeEmail}
                    onChange={(value) => handleInputChange("granteeEmail", value)}
                    placeholder="grantee@example.com"
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      id="category"
                      label="Category"
                      type="select"
                      value={formData.category}
                      onChange={(value) => handleInputChange("category", value)}
                      placeholder="Select category"
                      options={[
                        { value: "development", label: "Development" },
                        { value: "education", label: "Education" },
                        { value: "infrastructure", label: "Infrastructure" },
                        { value: "content", label: "Content" },
                        { value: "research", label: "Research" },
                        { value: "technology", label: "Technology" },
                      ]}
                      required
                    />
                  </div>

                  <FormField
                    id="programType"
                    label="Program Type"
                    type="select"
                    value={formData.programType}
                    onChange={(value) => handleInputChange("programType", value)}
                    placeholder="Select program type"
                    options={[
                      { value: "milestone", label: "Milestone-based Program" },
                      { value: "program", label: "Program with Sub-projects" },
                    ]}
                    helpText="Milestone-based programs track progress through milestones. Programs with sub-projects contain multiple projects instead of milestones."
                    required
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-white font-medium">Budget & Funding *</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFundingDetail}
                        className="h-8 border-[#10c0dd] text-[#10c0dd] hover:bg-[#10c0dd]/10"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Currency
                      </Button>
                    </div>
                    
                    {formData.fundingDetails.map((detail, index) => (
                      <div key={index} className="flex gap-4 items-end">
                        <div className="flex-1">
                          <FormField
                            id={`fundingAmount-${index}`}
                            label={index === 0 ? "Amount" : ""}
                            type="number"
                            value={detail.amount}
                            onChange={(value) => handleFundingDetailChange(index, "amount", value)}
                            placeholder="e.g. 25000"
                            required
                          />
                        </div>
                        <div className="w-32">
                          <FormField
                            id={`fundingCurrency-${index}`}
                            label={index === 0 ? "Currency" : ""}
                            type="select"
                            value={detail.currency}
                            onChange={(value) => handleFundingDetailChange(index, "currency", value)}
                            options={[
                              { value: "USD", label: "USD" },
                              { value: "CKB", label: "CKB" },
                            ]}
                            required
                          />
                        </div>
                        {formData.fundingDetails.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFundingDetail(index)}
                            className="mb-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Plus className="w-4 h-4 rotate-45" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <FormField
                    id="duration"
                    label="Duration"
                    value={formData.duration}
                    onChange={(value) => handleInputChange("duration", value)}
                    placeholder="e.g., 1 year, 6 months, 3 weeks"
                    required
                  />

                  <FormField
                    id="background"
                    label="Project Background"
                    type="textarea"
                    value={formData.background}
                    onChange={(value) => handleInputChange("background", value)}
                    placeholder="Describe the project background and context..."
                    required
                  />

                  <FormField
                    id="missionExpertise"
                    label="Mission & Expertise"
                    type="textarea"
                    value={formData.missionExpertise}
                    onChange={(value) => handleInputChange("missionExpertise", value)}
                    placeholder="Describe the mission and team expertise..."
                    required
                  />

                  <FormField
                    id="campaignGoals"
                    label="Campaign Goals"
                    type="textarea"
                    value={formData.campaignGoals}
                    onChange={(value) => handleInputChange("campaignGoals", value)}
                    placeholder="Describe the campaign goals and expected outcomes..."
                    required
                  />

                  <div className="space-y-4">
                    <h3 className="text-white font-medium text-lg">Creator Statistics (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        id="creatorStat1Name"
                        label="Statistic 1 Name"
                        value={formData.creatorStat1Name}
                        onChange={(value) => handleInputChange("creatorStat1Name", value)}
                        placeholder="e.g., GitHub Stars, Followers, etc."
                      />
                      <FormField
                        id="creatorStat1Number"
                        label="Statistic 1 Number"
                        type="number"
                        value={formData.creatorStat1Number}
                        onChange={(value) => handleInputChange("creatorStat1Number", value)}
                        placeholder="1000"
                      />

                      <FormField
                        id="creatorStat2Name"
                        label="Statistic 2 Name"
                        value={formData.creatorStat2Name}
                        onChange={(value) => handleInputChange("creatorStat2Name", value)}
                        placeholder="e.g., Years Experience, Projects, etc."
                      />
                      <FormField
                        id="creatorStat2Number"
                        label="Statistic 2 Number"
                        type="number"
                        value={formData.creatorStat2Number}
                        onChange={(value) => handleInputChange("creatorStat2Number", value)}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <FormField
                    id="githubRepo"
                    label="GitHub Repository Link"
                    type="url"
                    value={formData.githubRepo}
                    onChange={(value) => handleInputChange("githubRepo", value)}
                    placeholder="https://github.com/username/repository"
                  />

                  <FormField
                    id="proposalLink"
                    label="Proposal Link"
                    type="url"
                    value={formData.proposalLink}
                    onChange={(value) => handleInputChange("proposalLink", value)}
                    placeholder="https://example.com/proposal-document"
                    helpText="Optional: Link to the original project proposal document"
                  />

                  <div className="space-y-4">
                    <h3 className="text-white font-medium text-lg">Platform Links (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        id="youtubeLink"
                        label="YouTube"
                        type="url"
                        value={formData.youtubeLink}
                        onChange={(value) => handleInputChange("youtubeLink", value)}
                        placeholder="https://youtube.com/@username"
                      />

                      <FormField
                        id="tiktokLink"
                        label="TikTok"
                        type="url"
                        value={formData.tiktokLink}
                        onChange={(value) => handleInputChange("tiktokLink", value)}
                        placeholder="https://tiktok.com/@username"
                      />

                      <FormField
                        id="twitterLink"
                        label="X/Twitter"
                        type="url"
                        value={formData.twitterLink}
                        onChange={(value) => handleInputChange("twitterLink", value)}
                        placeholder="https://x.com/username"
                      />

                      <FormField
                        id="twitchLink"
                        label="Twitch"
                        type="url"
                        value={formData.twitchLink}
                        onChange={(value) => handleInputChange("twitchLink", value)}
                        placeholder="https://twitch.tv/username"
                      />
                    </div>
                  </div>

                  <FormField
                    id="websiteLinks"
                    label="Website / Platform Links"
                    type="textarea"
                    value={formData.websiteLinks}
                    onChange={(value) => handleInputChange("websiteLinks", value)}
                    placeholder="Enter website URLs, social media links, etc. (one per line)"
                    helpText="Optional: Add website, social media, or other platform links (one per line)"
                  />

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="border-border text-muted-foreground hover:bg-card"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#10c0dd] hover:bg-[#0ea5e9] text-white"
                    >
                      {isSubmitting ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewProjectForm />
    </Suspense>
  )
}
