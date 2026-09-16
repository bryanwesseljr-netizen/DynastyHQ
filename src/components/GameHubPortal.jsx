import GameHubPortalBase from './GameHubPortalBase.jsx';
import GameHubOfficialMediaBridgePortal from './GameHubOfficialMediaBridgePortal.jsx';
import GameHubStoryDirectorBridgePortal from './GameHubStoryDirectorBridgePortal.jsx';

const GameHubPortal = () => (
  <>
    <GameHubPortalBase />
    <GameHubOfficialMediaBridgePortal />
    <GameHubStoryDirectorBridgePortal />
  </>
);

export default GameHubPortal;
