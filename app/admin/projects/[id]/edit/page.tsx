"use client"

import type React from "react"
import { useState, useEffect, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Loader2, Edit3, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { FormField } from "@/components/forms/form-field"
import { useProject } from "@/hooks/use-project"

function EditProjectContent({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { project, isLoading, error } = useProject(id)
  
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

  // Update form data when project is loaded
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.name || "",
        creatorUsername: project.creator_username || project.discord_channel || "",
        granteeEmail: project.grantee_email || "",
        background: project.description || project.project_background || "",
        missionExpertise: project.mission_expertise || "",
        campaignGoals: project.campaign_goals || "",
        fundingRequested: project.funding_amount ? String(project.funding_amount) : "",
        fundingCurrency: project.funding_currency || "USD",
        fundingDetails: project.funding_details && project.funding_details.length > 0
          ? project.funding_details.map(d => ({ amount: String(d.amount), currency: d.currency }))
          : [{ amount: "", currency: "USD" }],
        githubRepo: project.github_repo || "",
        proposalLink: project.proposal_link || "",
        websiteLinks: project.website_links || "",
        programType: project.program_type || "",
        category: project.category || "",
        duration: project.duration || "",
        creatorStat1Name: project.creator_stat_1_name || "",
        creatorStat1Number: project.creator_stat_1_number ? String(project.creator_stat_1_number) : "",
        creatorStat2Name: project.creator_stat_2_name || "",
        creatorStat2Number: project.creator_stat_2_number ? String(project.creator_stat_2_number) : "",
        youtubeLink: project.youtube_link || "",
        tiktokLink: project.tiktok_link || "",
        twitterLink: project.twitter_link || "",
        twitchLink: project.twitch_link || "",
      })
    }
  }, [project])

  // AI Extraction logic for tempId
  useEffect(() => {
    const tempId = searchParams.get("tempId")
    if (tempId && project) {
      // Capture project in a local constant to prevent type narrowing issues in async closures
      const currentProject = project

      async function fetchAndAnalyze() {
        setIsAnalyzing(true)
        try {
          const msgRes = await fetch(`/api/discord/temp-message/${tempId}`)
          if (!msgRes.ok) throw new Error("Failed to fetch message content")
          const msgData = await msgRes.json()
          
          const aiRes = await fetch("/api/ai/extract-project-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: msgData.content })
          })
          
          const extracted = await aiRes.json()
          if (!aiRes.ok) throw new Error(extracted.error || "AI extraction failed")

          setFormData(prev => ({
            ...prev,
            title: isEditable(currentProject.name) ? (extracted.projectName || prev.title) : prev.title,
            background: isEditable(currentProject.description) ? (extracted.projectDescription || prev.background) : prev.background,
            fundingRequested: isEditable(currentProject.funding_amount) ? (extracted.fundingRequested ? String(extracted.fundingRequested) : prev.fundingRequested) : prev.fundingRequested,
            fundingCurrency: isEditable(currentProject.funding_currency) ? (extracted.fundingCurrency || prev.fundingCurrency) : prev.fundingCurrency,
            category: isEditable(currentProject.category) ? (extracted.category || prev.category) : prev.category,
            programType: isEditable(currentProject.program_type) ? (extracted.programType || prev.programType) : prev.programType,
            duration: isEditable(currentProject.duration) ? (extracted.duration || prev.duration) : prev.duration,
            githubRepo: isEditable(currentProject.github_repo) ? (extracted.githubRepo || prev.githubRepo) : prev.githubRepo,
            proposalLink: isEditable(currentProject.proposal_link) ? (extracted.proposalLink || prev.proposalLink) : prev.proposalLink,
            granteeEmail: isEditable(currentProject.grantee_email) ? (extracted.granteeEmail || prev.granteeEmail) : prev.granteeEmail,
            missionExpertise: isEditable(currentProject.mission_expertise) ? (extracted.missionExpertise || prev.missionExpertise) : prev.missionExpertise,
            campaignGoals: isEditable(currentProject.campaign_goals) ? (extracted.campaignGoals || prev.campaignGoals) : prev.campaignGoals,
          }))

          setIsAutoFilled(true)
          toast({
            title: "AI Analysis Complete",
            description: "Form has been auto-filled with extracted data where fields were empty.",
          })
        } catch (error: any) {
          console.error("Auto-fill error:", error)
          toast({
            title: "Auto-fill Failed",
            description: error.message || "Could not automatically extract info.",
            variant: "destructive"
          })
        } finally {
          setIsAnalyzing(false)
        }
      }
      fetchAndAnalyze()
    }
  }, [searchParams, project, toast])

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

  const isEditable = (fieldValue: any) => {
    if (Array.isArray(fieldValue)) return fieldValue.length === 0
    return fieldValue === null || fieldValue === undefined || fieldValue === "" || fieldValue === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.title || null,
          description: formData.background || null,
          github_repo: formData.githubRepo || null,
          proposal_link: formData.proposalLink || null,
          discord_channel: formData.creatorUsername || null,
          creator_username: formData.creatorUsername || null,
          funding_amount: formData.fundingRequested ? Number.parseFloat(formData.fundingRequested) : null,
          funding_currency: formData.fundingCurrency || null,
          funding_details: formData.fundingDetails.filter(d => d.amount).length > 0
            ? formData.fundingDetails.filter(d => d.amount).map(d => ({ amount: Number.parseFloat(d.amount), currency: d.currency }))
            : null,
          grantee_email: formData.granteeEmail || null,
          mission_expertise: formData.missionExpertise || null,
          campaign_goals: formData.campaignGoals || null,
          website_links: formData.websiteLinks || null,
          program_type: formData.programType || null,
          category: formData.category || null,
          duration: formData.duration || null,
          creator_stat_1_name: formData.creatorStat1Name || null,
          creator_stat_1_number: formData.creatorStat1Number ? Number.parseInt(formData.creatorStat1Number) : null,
          creator_stat_2_name: formData.creatorStat2Name || null,
          creator_stat_2_number: formData.creatorStat2Number ? Number.parseInt(formData.creatorStat2Number) : null,
          youtube_link: formData.youtubeLink || null,
          tiktok_link: formData.tiktokLink || null,
          twitter_link: formData.twitterLink || null,
          twitch_link: formData.twitchLink || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update project")
      }

      toast({
        title: "Project Updated",
        description: `${formData.title} has been successfully updated.`,
      })

      router.push(`/projects/${id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-white pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10c0dd]" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-white pt-20 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || "Project not found"}</p>
        <Link href="/admin">
          <Button variant="outline">Back to Admin</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/projects/${id}`} className="flex items-center gap-2 text-white hover:text-[#10c0dd] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Project</span>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className={`bg-card/80 backdrop-blur-sm border-border/50 ${isAutoFilled ? 'ring-2 ring-[#10c0dd]' : ''}`}>
              <CardHeader>
                <CardTitle className="text-white text-2xl font-bold flex items-center gap-2">
                  <Edit3 className="w-6 h-6 text-[#10c0dd]" />
                  Edit Project: {project.name}
                </CardTitle>
                <p className="text-muted-foreground">
                  Update project information. Required fields (*) are read-only, while optional fields can be edited.
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
                    disabled={true}
                  />

                  <FormField
                    id="creatorUsername"
                    label="Creator Username (Discord)"
                    value={formData.creatorUsername}
                    onChange={(value) => handleInputChange("creatorUsername", value)}
                    placeholder="Discord username for authentication"
                    required
                    disabled={true}
                  />

                  <FormField
                    id="granteeEmail"
                    label="Grantee Email"
                    type="email"
                    value={formData.granteeEmail}
                    onChange={(value) => handleInputChange("granteeEmail", value)}
                    placeholder="grantee@example.com"
                    required
                    disabled={true}
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
                      disabled={true}
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
                    disabled={true}
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
                        disabled={true}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Currency
                      </Button>
                    </div>

                    <div className="p-4 border border-[#10c0dd]/30 rounded-lg bg-[#10c0dd]/5 mb-4">
                      <FormField
                        id="fundingRequested"
                        label="Total Budget / Funding (USD) *"
                        type="number"
                        value={formData.fundingRequested}
                        onChange={(value) => handleInputChange("fundingRequested", value)}
                        placeholder="Total project budget in USD (e.g. 2000)"
                        required
                        helpText="The total budget for the project in USD. This is the primary amount displayed on project cards and the homepage."
                        disabled={true}
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      Breakdown of funding by currency (USD/CKB):
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
                            disabled={true}
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
                            disabled={true}
                          />
                        </div>
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
                    disabled={true}
                  />

                  <FormField
                    id="background"
                    label="Project Background"
                    type="textarea"
                    value={formData.background}
                    onChange={(value) => handleInputChange("background", value)}
                    placeholder="Describe the project background and context..."
                    required
                    disabled={true}
                  />

                  <FormField
                    id="missionExpertise"
                    label="Mission & Expertise"
                    type="textarea"
                    value={formData.missionExpertise}
                    onChange={(value) => handleInputChange("missionExpertise", value)}
                    placeholder="Describe the mission and team expertise..."
                    required
                    disabled={true}
                  />

                  <FormField
                    id="campaignGoals"
                    label="Campaign Goals"
                    type="textarea"
                    value={formData.campaignGoals}
                    onChange={(value) => handleInputChange("campaignGoals", value)}
                    placeholder="Describe the campaign goals and expected outcomes..."
                    required
                    disabled={true}
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
                        disabled={false}
                      />
                      <FormField
                        id="creatorStat1Number"
                        label="Statistic 1 Number"
                        type="number"
                        value={formData.creatorStat1Number}
                        onChange={(value) => handleInputChange("creatorStat1Number", value)}
                        placeholder="1000"
                        disabled={false}
                      />

                      <FormField
                        id="creatorStat2Name"
                        label="Statistic 2 Name"
                        value={formData.creatorStat2Name}
                        onChange={(value) => handleInputChange("creatorStat2Name", value)}
                        placeholder="e.g., Years Experience, Projects, etc."
                        disabled={false}
                      />
                      <FormField
                        id="creatorStat2Number"
                        label="Statistic 2 Number"
                        type="number"
                        value={formData.creatorStat2Number}
                        onChange={(value) => handleInputChange("creatorStat2Number", value)}
                        placeholder="5"
                        disabled={false}
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
                    disabled={false}
                  />

                  <FormField
                    id="proposalLink"
                    label="Proposal Link"
                    type="url"
                    value={formData.proposalLink}
                    onChange={(value) => handleInputChange("proposalLink", value)}
                    placeholder="https://example.com/proposal-document"
                    helpText="Optional: Link to the original project proposal document"
                    disabled={false}
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
                        disabled={false}
                      />

                      <FormField
                        id="tiktokLink"
                        label="TikTok"
                        type="url"
                        value={formData.tiktokLink}
                        onChange={(value) => handleInputChange("tiktokLink", value)}
                        placeholder="https://tiktok.com/@username"
                        disabled={false}
                      />

                      <FormField
                        id="twitterLink"
                        label="X/Twitter"
                        type="url"
                        value={formData.twitterLink}
                        onChange={(value) => handleInputChange("twitterLink", value)}
                        placeholder="https://x.com/username"
                        disabled={false}
                      />

                      <FormField
                        id="twitchLink"
                        label="Twitch"
                        type="url"
                        value={formData.twitchLink}
                        onChange={(value) => handleInputChange("twitchLink", value)}
                        placeholder="https://twitch.tv/username"
                        disabled={false}
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
                    disabled={false}
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
                      {isSubmitting ? "Saving..." : "Save Project"}
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

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-white pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10c0dd]" />
      </div>
    }>
      <EditProjectContent params={resolvedParams} />
    </Suspense>
  )
}
