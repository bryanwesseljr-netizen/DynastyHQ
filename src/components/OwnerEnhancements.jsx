import WeekSetupPortal from './WeekSetupPortal.jsx';
import GameweekFlowPortal from './GameweekFlowPortal.jsx';
import QuickImportPortal from './QuickImportPortal.jsx';
import WeeklyAgendaV2Portal from './WeeklyAgendaV2Portal.jsx';
import CoverageReferencesPortal from './CoverageReferencesPortal.jsx';
import CollegeGameCoverageRepairPortal from './CollegeGameCoverageRepairPortal.jsx';
import CollegeCareerAgendaCardPortal from './CollegeCareerAgendaCardPortal.jsx';
import RtgStatusScannerPortal from './RtgStatusScannerPortal.jsx';
import CoachRecruitingWorkspaceV2Portal from './CoachRecruitingWorkspaceV2Portal.jsx';
import PodcastHumanizedAudioPortal from './PodcastHumanizedAudioPortal.jsx';
import PodcastArtworkHydrationPortal from './PodcastArtworkHydrationPortal.jsx';
import PodcastLocalShowPortal from './PodcastLocalShowPortal.jsx';
import PodcastMasterAudioPortalV2 from './PodcastMasterAudioPortalV2.jsx';
import PodcastSeekControlsPortal from './PodcastSeekControlsPortal.jsx';
import EditorialPhotoDirectorPortal from './EditorialPhotoDirectorPortal.jsx';
import NewsroomArticleExperiencePortal from './NewsroomArticleExperiencePortal.jsx';
import NewsroomArticleToolsPortal from './NewsroomArticleToolsPortal.jsx';
import NewsroomArticleSharePortal from './NewsroomArticleSharePortal.jsx';
import NewsroomExactStoryRoutingPortal from './NewsroomExactStoryRoutingPortal.jsx';
import NewsroomTeamHubPortal from './NewsroomTeamHubPortal.jsx';
import TeamAccentPortal from './TeamAccentPortal.jsx';
import { OwnerCareerProvider } from './OwnerCareerContext.jsx';

const OwnerEnhancements = () => (
  <OwnerCareerProvider>
    <TeamAccentPortal />
    <CollegeGameCoverageRepairPortal />
    <WeekSetupPortal />
    <GameweekFlowPortal />
    <QuickImportPortal />
    <WeeklyAgendaV2Portal />
    <CoverageReferencesPortal />
    <CollegeCareerAgendaCardPortal />
    <RtgStatusScannerPortal />
    <CoachRecruitingWorkspaceV2Portal />
    <EditorialPhotoDirectorPortal />
    <NewsroomExactStoryRoutingPortal />
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
