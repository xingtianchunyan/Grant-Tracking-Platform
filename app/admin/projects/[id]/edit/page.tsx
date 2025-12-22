"use client"

import type React from "react"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { FormField } from "@/components/forms/form-field"
import { useProject } from "@/hooks/use-project"
import { Plus } from "lucide-react"

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { project, isLoading, error } = useProject(id)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const isEditable = (value: any) => {
    if (Array.isArray(value)) return value.length === 0
    return value === null || value === undefined || value === "" || value === 0
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
          name: formData.title,
          description: formData.background,
          github_repo: formData.githubRepo,
          proposal_link: formData.proposalLink,
          discord_channel: formData.creatorUsername,
          creator_username: formData.creatorUsername,
          funding_amount: Number.parseFloat(formData.fundingRequested) || 0,
          funding_currency: formData.fundingCurrency,
          funding_details: formData.fundingDetails
            .filter(d => d.amount)
            .map(d => ({ amount: Number.parseFloat(d.amount), currency: d.currency })),
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
        throw new Error("Failed to update project")
      }

      toast({
        title: "Project Updated",
        description: `${formData.title} has been successfully updated.`,
      })

      router.push(`/admin/projects/${id}`)
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
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/admin/projects/${id}`} className="flex items-center gap-2 text-white hover:text-[#10c0dd] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Project</span>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-white text-2xl font-bold flex items-center gap-2">
                  <Edit3 className="w-6 h-6 text-[#10c0dd]" />
                  Edit Project: {project.name}
                </CardTitle>
                <p className="text-muted-foreground">
                  Update project information. Fields with existing data are read-only.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormField
                    id="title"
                    label="Project Title"
                    value={formData.title}
                    onChange={(value) => handleInputChange("title", value)}
                    disabled={!isEditable(project.name)}
                    required
                  />

                  <FormField
                    id="creatorUsername"
                    label="Creator Username (Discord)"
                    value={formData.creatorUsername}
                    onChange={(value) => handleInputChange("creatorUsername", value)}
                    disabled={!isEditable(project.creator_username || project.discord_channel)}
                    required
                  />

                  <FormField
                    id="granteeEmail"
                    label="Grantee Email"
                    type="email"
                    value={formData.granteeEmail}
                    onChange={(value) => handleInputChange("granteeEmail", value)}
                    disabled={!isEditable(project.grantee_email)}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      id="category"
                      label="Category"
                      type="select"
                      value={formData.category}
                      onChange={(value) => handleInputChange("category", value)}
                      disabled={!isEditable(project.category)}
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
                    disabled={!isEditable(project.program_type)}
                    options={[
                      { value: "milestone", label: "Milestone-based Program" },
                      { value: "program", label: "Program with Sub-projects" },
                    ]}
                    required
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-white font-medium">Budget & Funding *</label>
                      {!isEditable(project.funding_details) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addFundingDetail}
                          className="h-8 border-[#10c0dd] text-[#10c0dd] hover:bg-[#10c0dd]/10"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Currency
                        </Button>
                      )}
                    </div>

                    <div className="p-4 border border-[#10c0dd]/30 rounded-lg bg-[#10c0dd]/5 mb-4">
                      <FormField
                        id="fundingRequested"
                        label="Total Budget / Funding (USD) *"
                        type="number"
                        value={formData.fundingRequested}
                        onChange={(value) => handleInputChange("fundingRequested", value)}
                        disabled={!isEditable(project.funding_amount)}
                        required
                        helpText="The total budget for the project in USD."
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
                            disabled={!isEditable(project.funding_details && project.funding_details[index]?.amount)}
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
                            disabled={!isEditable(project.funding_details && project.funding_details[index]?.currency)}
                            options={[
                              { value: "USD", label: "USD" },
                              { value: "CKB", label: "CKB" },
                            ]}
                            required
                          />
                        </div>
                        {formData.fundingDetails.length > 1 && isEditable(project.funding_details && project.funding_details[index]) && (
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
                    disabled={!isEditable(project.duration)}
                    required
                  />

                  <FormField
                    id="background"
                    label="Project Background"
                    type="textarea"
                    value={formData.background}
                    onChange={(value) => handleInputChange("background", value)}
                    disabled={!isEditable(project.description || project.project_background)}
                    required
                  />

                  <FormField
                    id="missionExpertise"
                    label="Mission & Expertise"
                    type="textarea"
                    value={formData.missionExpertise}
                    onChange={(value) => handleInputChange("missionExpertise", value)}
                    disabled={!isEditable(project.mission_expertise)}
                    required
                  />

                  <FormField
                    id="campaignGoals"
                    label="Campaign Goals"
                    type="textarea"
                    value={formData.campaignGoals}
                    onChange={(value) => handleInputChange("campaignGoals", value)}
                    disabled={!isEditable(project.campaign_goals)}
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
                        disabled={!isEditable(project.creator_stat_1_name)}
                      />
                      <FormField
                        id="creatorStat1Number"
                        label="Statistic 1 Number"
                        type="number"
                        value={formData.creatorStat1Number}
                        onChange={(value) => handleInputChange("creatorStat1Number", value)}
                        disabled={!isEditable(project.creator_stat_1_number)}
                      />
                      <FormField
                        id="creatorStat2Name"
                        label="Statistic 2 Name"
                        value={formData.creatorStat2Name}
                        onChange={(value) => handleInputChange("creatorStat2Name", value)}
                        disabled={!isEditable(project.creator_stat_2_name)}
                      />
                      <FormField
                        id="creatorStat2Number"
                        label="Statistic 2 Number"
                        type="number"
                        value={formData.creatorStat2Number}
                        onChange={(value) => handleInputChange("creatorStat2Number", value)}
                        disabled={!isEditable(project.creator_stat_2_number)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-white font-medium text-lg">Social & Project Links (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        id="githubRepo"
                        label="GitHub Repository"
                        value={formData.githubRepo}
                        onChange={(value) => handleInputChange("githubRepo", value)}
                        disabled={!isEditable(project.github_repo)}
                      />
                      <FormField
                        id="proposalLink"
                        label="Proposal Link"
                        value={formData.proposalLink}
                        onChange={(value) => handleInputChange("proposalLink", value)}
                        disabled={!isEditable(project.proposal_link)}
                      />
                    </div>
                    <FormField
                      id="websiteLinks"
                      label="Website Links"
                      value={formData.websiteLinks}
                      onChange={(value) => handleInputChange("websiteLinks", value)}
                      disabled={!isEditable(project.website_links)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        id="youtubeLink"
                        label="YouTube"
                        value={formData.youtubeLink}
                        onChange={(value) => handleInputChange("youtubeLink", value)}
                        disabled={!isEditable(project.youtube_link)}
                      />
                      <FormField
                        id="tiktokLink"
                        label="TikTok"
                        value={formData.tiktokLink}
                        onChange={(value) => handleInputChange("tiktokLink", value)}
                        disabled={!isEditable(project.tiktok_link)}
                      />
                      <FormField
                        id="twitterLink"
                        label="Twitter (X)"
                        value={formData.twitterLink}
                        onChange={(value) => handleInputChange("twitterLink", value)}
                        disabled={!isEditable(project.twitter_link)}
                      />
                      <FormField
                        id="twitchLink"
                        label="Twitch"
                        value={formData.twitchLink}
                        onChange={(value) => handleInputChange("twitchLink", value)}
                        disabled={!isEditable(project.twitch_link)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
                    <Link href={`/projects/${id}`}>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" className="bg-[#10c0dd] hover:bg-[#10c0dd]/80" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
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
