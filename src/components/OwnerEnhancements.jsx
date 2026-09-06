import WeekSetupPortal from './WeekSetupPortal.jsx';
import GameweekFlowPortal from './GameweekFlowPortal.jsx';
import QuickImportPortal from './QuickImportPortal.jsx';
import SessionImportPortal from './SessionImportPortal.jsx';
import CareerOverviewPortal from './CareerOverviewPortal.jsx';
import GameHubPortal from './GameHubPortal.jsx';
import WeeklyAgendaV2Portal from './WeeklyAgendaV2Portal.jsx';
import WeeklyDataIntakePortal from './WeeklyDataIntakePortal.jsx';
import DryRunModePortal from './DryRunModePortal.jsx';
import AiScanRoutingPortal from './AiScanRoutingPortal.jsx';
import CoverageDataIntakePortal from './CoverageDataIntakePortal.jsx';
import RtgStatusIntakePortal from './RtgStatusIntakePortal.jsx';
import WeeklyAppearanceAndLocationPortal from './WeeklyAppearanceAndLocationPortal.jsx';
import CollegeGameCoverageRepairPortal from './CollegeGameCoverageRepairPortal.jsx';
import CollegeCareerAgendaCardPortal from './CollegeCareerAgendaCardPortal.jsx';
import CoachRecruitingWorkspaceV2Portal from './CoachRecruitingWorkspaceV2Portal.jsx';
import PodcastHumanizedAudioPortal from './PodcastHumanizedAudioPortal.jsx';
import PodcastArtworkHydrationPortal from './PodcastArtworkHydrationPortal.jsx';
import PodcastLocalShowPortal from './PodcastLocalShowPortal.jsx';
import PodcastMasterAudioPortalV2 from './PodcastMasterAudioPortalV2.jsx';
import PodcastSeekControlsPortal from './PodcastSeekControlsPortal.jsx';
import EditorialPhotoDirectorPortal from './EditorialPhotoDirectorPortal.jsx';
import EditorialLanguageRealismPortal from './EditorialLanguageRealismPortal.jsx';
import NewsroomGameLocationPortal from './NewsroomGameLocationPortal.jsx';
import NewsroomUniformContextPortal from './NewsroomUniformContextPortal.jsx';
import NewsroomArticleExperiencePortal from './NewsroomArticleExperiencePortal.jsx';
import NewsroomArticleToolsPortal from './NewsroomArticleToolsPortal.jsx';
import NewsroomArticleSharePortal from './NewsroomArticleSharePortal.jsx';
import NewsroomExactStoryRoutingPortal from './NewsroomExactStoryRoutingPortal.jsx';
import NewsroomLibraryScrollGuardPortal from './NewsroomLibraryScrollGuardPortal.jsx';
import NewsroomTeamHubPortal from './NewsroomTeamHubPortal.jsx';
import PublicMediaProfileSharePortal from './PublicMediaProfileSharePortal.jsx';
import TeamAccentPortal from './TeamAccentPortal.jsx';
import { OwnerCareerProvider } from './OwnerCareerContext.jsx';

const OwnerEnhancements = () => (
  <OwnerCareerProvider>
    <TeamAccentPortal />
    <PublicMediaProfileSharePortal />
    <CollegeGameCoverageRepairPortal />
    <WeekSetupPortal />
    <GameweekFlowPortal />
    <QuickImportPortal />
    <SessionImportPortal />
    <CareerOverviewPortal />
    <GameHubPortal />
    <WeeklyAgendaV2Portal />
    <WeeklyDataIntakePortal />
    <DryRunModePortal />
    <AiScanRoutingPortal />
    <WeeklyAppearanceAndLocationPortal />
    <RtgStatusIntakePortal />
    <CoverageDataIntakePortal />
    <CollegeCareerAgendaCardPortal />
    <CoachRecruitingWorkspaceV2Portal />
    <EditorialPhotoDirectorPortal />
    <EditorialLanguageRealismPortal />
    <NewsroomGameLocationPortal />
    <NewsroomUniformContextPortal />
    <NewsroomExactStoryRoutingPortal />
    <NewsroomLibraryScrollGuardPortal />
    <NewsroomTeamHubPortal />
    <NewsroomArticleExperiencePortal />
    <NewsroomArticleToolsPortal />
    <NewsroomArticleSharePortal />
    <PodcastArtworkHydrationPortal />
    <PodcastLocalShowPortal />
    <PodcastHumanizedAudioPortal />
    <PodcastMasterAudioPortalV2 />
    <PodcastSeekControlsPortal />
  </OwnerCareerProvider>
);

export default OwnerEnhancements;
