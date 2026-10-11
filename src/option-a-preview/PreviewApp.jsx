import React, { useEffect, useMemo, useRef, useState } from 'react';
import './preview.css';
import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import {
  Archive, Award, BarChart3, Bell, BookOpen, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Copy, FileText, Headphones, Home, Image as ImageIcon, Link2, LockKeyhole, Menu,
  Mic2, MoreHorizontal, Newspaper, Pause, Pencil, Play, Search, Share2, Shield, ShieldCheck, Sparkles, Target,
  TrendingUp, Trophy, Trash2, Upload, UserRound, X, Zap, RadioTower
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import podcastCover from '../assets/gridiron-grind-cover.webp';
import { derivePreviewData, useReadOnlyLiveCareer } from './useReadOnlyLiveCareer.js';
import ScheduleExperience from './ScheduleExperience.jsx';
import OffseasonCoverageStudio from './OffseasonCoverageStudio.jsx';
import { scheduleDisplayLabel } from '../domain/seasonSchedule.js';
import { nextCareerMatchupForHome, weekSelectorOptions, weekSelectorDisplayLabel } from '../domain/previewHomeMatchup.js';
import { postseasonPendingLabel } from '../domain/postseasonContext.js';
import { buildNotebookLmProducerPack, latestNotebookGameSelection } from '../domain/notebookLmProducerPack.js';
import { resolveTeamBrand } from '../domain/teamBrandResolver.js';
import { analyzeScreenshot } from '../services/screenshotClient.js';
import { analyzeRtgStatusScreenshot } from '../services/rtgStatusScannerClient.js';
import { analyzeCoverageReference } from '../services/coverageReferenceClient.js';
import { compressImage } from '../services/imageCompression.js';
import { createFailedScreenshotResult, normalizeScreenshotAnalysis as normalizeGameScreenshotAnalysis } from '../domain/screenshotAnalysis.js';
import { mergeOfficialCoveragePages } from '../domain/officialCoverageCapture.js';
import { stitchOfficialArticlePages } from '../domain/officialArticleStitcher.js';
import {
  correctPublishedWeek,
  createEmptyScanDraft,
  createPublishedWeek,
  createWeekKey,
  findPublishedWeekConflict,
  mergeScanResult,
} from '../domain/weeklyEngine.js';
import { replaceCoverageReferences } from '../domain/coverageReferences.js';
import {
  applyGeneratedNewsroomEdition,
  buildNewsroomGenerationPayload,
  normalizeGeneratedNewsroomEdition,
} from '../domain/newsroomGeneration.js';
import {
  buildPodcastGenerationPayload,
  normalizeGeneratedPodcast,
  upsertPodcastEpisode,
} from '../domain/podcastEngine.js';
import { generateNewsroomEdition } from '../services/newsroomClient.js';
import { generatePodcastScript } from '../services/podcastClient.js';
import { createRtgSnapshot, diffRtgSnapshots, hasRtgSnapshot } from '../domain/rtgProgress.js';
import { detectDestructiveCareerRegression } from '../domain/saveProtection.js';
import { estimatedJsonBytes, splitCareerStateForStorage } from '../domain/careerStorage.js';
import { auth, db, firebaseApp, productionAppId } from '../firebase.js';
import { deleteNewsroomMedia, uploadNewsroomMedia } from '../services/newsroomMediaStorage.js';
import { assignLibraryPhotosToEdition, assignNewsroomMedia, createNewsroomMediaAsset, NEWSROOM_MEDIA_ORIGINS } from '../domain/newsroomMedia.js';
import {
  loadPodcastAudioCloud,
  loadPodcastAudioLocal,
  podcastAudioBlob,
  savePodcastAudioCloud,
  savePodcastAudioLocal,
} from '../services/podcastAudioStorage.js';
import {
  careerArchiveRef,
  readHydratedCareerInTransaction,
  writeHydratedCareerInTransaction,
} from '../services/careerStorageFirestore.js';

const playerPhoto = 'data:image/webp;base64,UklGRnYgAABXRUJQVlA4IGogAABQmgCdASosAcUAPu1iqU8ppSOprHYOWTAdiWInABSVOw3weN5hHLPlEEO6ye89NP923jXOx+cJv4G9LWk9zWxs9XoslzHWb4o4PyTg8WXDKAvFg+yPYSQcfgNHVMBkMCBeM60yiLhm5jhK276da4U3v+yKmwYIBamn3lEYMGpL+goKbjMwEncd1K5GkPUma1JJZKiwO+Y7aQxLe4aFTpi0FP5gCuTyJbxpJdcmNadjjRaCMC+axg2MqYC4Im+VLICwonkUawJDqqgnoGBn3Sj/Fju2LdraHrla4bFMtxg+YWJh9Spo30Zs3BFulAxOTBW+DcWkvVBVs7Ux/8617XknUswt4Xh7FMnyUIajnPQ/fj8zv24RibwuC8rwKmyP/bUmxMykMkEeL1t6tHAjLIP8uE8CZGWAHtq9f2ix2Pus6fxDiCIapHyX38+7YFD9m3cLDrrAHgsb78uCxYT72QxHrkZ9rOy7biu3OnzRe3E5fJM0ddPdvz8wtMneEyHdxWpYRWhz9sW6n40GprOUrSCsuJAx+iLdt6lQgcarmBELGtUILaqmgpDW6yZ6w4hnrYmJyOh6kVEfPOA6Gg/B3CiEK+ofoMRIO5ZLdvnbLxYS0g6XVTq/NAsy7n79nf7W2NVaW3cA94EQ9dhBidHCRGNXmZ88cY4zOBXkYb5L97z6hBGa0aSb5LTmy/a2hUwubqnHKgHLFAaZm0JsmN+VKJNoNTXib9aoBXEmEK9ulRcQTtk/FMgrLwSuKjURC+2cvV5dV/PITMTw3dOC/h9I+qa5BifxD9fXQFOXe0tE5DZVKYsYvoubDuc6YoFFt0/djHClOozqH93lyMeAIKttwNLUa8ShZ14Lx9XrbzMPHdKm2xpdBOvg7Bh7gFPR/kEWSRtUPVpvXApWN/+5gJgE0WDraOG+LGvnTPFFVKdS5G+h+FxWIQAgNUUcxmjzXeFRiDYB/X2m49QoiHct6GagzkgOZ1mPUQUHNu+YkCMfkqCLaXuo2tuQEYxG9BiR5uuJh+5dqGomFEZKXizqRmc3W0mjnt9yxSNssx3JsMdyv15m7hsen0amczPYgKr0lNeMNM50Eojy1x5yf/WfoPP1Y/0uHU6CouiiaefBfp3EMS1i0UZZkenGN5d4qneFWel5SxocgX95yJP7A6wT4iBwSRgvRxBARPZBuxpcZGoQhHK5GOvsloyRX2kvGfzMi4DtNiMQLqmOhq+4VurBWlC+ANzIhIQieD/hvwkw00rvDx5P0Faox0CpOYx7EaHLkAqwOcKwVysm+evApCpSqe1qX2HfNjf5TsqFZ5m1KKVauVJpV97eufbJ0pwA1eghZhclLnkVRULzCKtyd1xoaJpQIndsT+S8v9b256hVvB/HRSo3Yo/UQ8tWannEoJ+zh9DDLR/zrK+8HvNW1Pgzdu3j2WwPr1xvf7jkz1zIDNspSMuJFvEbJxHKtoZPvs/WGZg4lAPSSIP4zKpP+hcQ/6jfpUmtD6eJI7LfEtaE4vWLCjkh+iRKBkWTQBG97MAlLmukNmnz31lo+83NFC7pEI8TPdM/MUsctaOwrvZ0WHO2/Wvi8q7FFF2Mv9vMm2Wub4wJhc0RkKEfluYDOHyn76nxZbieTkXOwwITm23T6GOouWhB/LZh3ORs6nTbN9pAAP71m+eVjfkKkwWMQjY1DsL/E22bKzt4C2iP6PCvk36N2z33HdPcm3ZSyUTyXnRnQRxaPGxKaJMx+flFnPCkbBUzIRMJJS92PFC1jv3OiWA/y/W7B9nnUerJyzaSuBm1wNfro3fm+c6rnz2KcM0wfuyNq+asPhKvClb7Y+vZuNM9dNx8JQBWzU43/3472+uXOPuyQzfMxO8Sky2yxafq6UQA+NA655HdOZKdvKBONNp5SVRsASSvmi9PgOi2G/7iGd1BcAuYHQEJ1qoW4juGRCyRMCdEj/kyBgyljRHZNv02hNoRP5qFPNZmqjYTLQUNXRhNsLvYqw7uSkX+0XzZkISxu1kOPGRdzljkli+3BhlXYsThuq8mI2dqPn/PdufAl7DS2hCUTHL/XOX16IYDFXWluH+zpeWKLomwHzIJpQ9TqF38lO44sSGh6HbpKIbvQThIyfJsEKDIfZ4OuYB28Bz8NCncw8q1joJGJ3t1AwLCTaKlaKGMj2QQr0DGRUpHKWxkumajP5rM2ueuQ6owz8ymC5pbRXJQix4YbBQUlk5ru5soSghfAbxszSUFmy2DCYcc0Tgpzyrvk1X0N5ueqclk+16xgnGThCxu4cl680qC636th0ujntFRMaRQdDBWHNPRUje9E0Rl1i/b2FlsuBsKPe//WjBpfX9Ru1YMz9YoXfasqyhWoMS6fIvpKYvPt3Lw55X+mE9L6bwB+wB4xYj5JfjbcgZoPCZqLhg3Vu5Vor2QBH9hFenJmsHYVpH93voHHdhmrZAE/yzu0BsfOz/kyN3YF5PU0Jx7q4OyPHI9Q1+nsjuAhTrJmBINprLE0fovQfhfqI24cYYa0Vu/6087T6mJG4/DaYYptmJhhbGrm3qRFNdpmKXa0+h3GeDEt3tzi7mur75K+XCk0kiAL5C/j4lA9PkvyOe+7KZEr3giqlZA1a4RqkUFhW9Xp8xLiAPVJFLYPbGGS+3N3Rawa3e3h7j8s3fzvVNc9OdrhN6k1syn3GdPrioLbXsBTISs2kzqni8UWS+bFTw4va74AOtHRuAe5KvhYAiW2PHxCZ83wikCQanr1apWjuP7Qguyow2YwiwIPTw6YBvw9AJpaOFhI+C8d7oBwmeAKVEZD7M5bax8m79Rm4nBP4gQZmDjWbISY1HZaI0qJB0x/E6G+bHg26FN3DHDKdzRxveGkbL7moAn2tqhP9vCPqgyS+QK4NfYsGUZeJ7/hkLxtVOMb5ihJz4FsU1n2gRhYM2M+BM+4h6/Sji6w3pQjYUhOvx7ptWugCjz6O95E3VBDZD4+xjUs9UEgZX4Z7EsZzLXuz5VJPHeZDyFlORc6JD/SMoJOh+dC8hjp8kPBSFA3NulbByyQUW7XINjWrobImVAFUcy2nGe8MGhtSoMIbUcY9lZHTfUqSZOVf++e9IjDelHkiiep2u42V6BZbBUHvYyLQc+PqS7Nk0CVXNQm7BNZe/4fpAWWFjFVXpXlxEDMAwcUcTNtdPfc7NmNI07GGjDQ7yEWjWVVeR/BduCDqzOIm66frNU6bUEEUdyuRQZTuhkDCXCqxfW2pg6BLtJoCNMVLSSwl8TchHmtJcp7y/f9GFTK2Ifdi3rsg7v8E0GDWXCstPzTmAvyjWIMstEUgAf8Xicnj7qwOyypk5fMZVda4+JXVN8ppglIeECCOR7UFg0Lu14afQQxvw15YgNt4Tp1HR5j9kCgU5qczengl+9CEdLZdoya+q49r2wrEpuuB8A0/J+GXqujHCBlmSafitICqnaYPYQZd8sXhlXV7+w5MzkS32iNOaj4S7b8h7vnD3Ei/Hr0KlNEZw9qKRO4aFgxpBb5M6d+VUIohBmzkoHg8HkkItMzJpwHw3rIxKK80DlgDxeUX0EqkH+hXKuzu5xGNYx0ReuDgPJUU8FEB1Ap8oD2ShNpUBShJLTo3aFJW2FpVCRir0ROpB/IMgP3glxX7Y1O8Kop8DUGw5qRAGSJfYp8OlyCs2mEvNqfawUHJB1AUwZAWTFfFuaf/umrWZtVba9DStv9aXgNrnMydstgzIIvuEnMG+oCTaABhgCH82jNwKxcRYxv6aHvCcuByBndC7U1wdOY3aEwd4TOvU6S0l7ACj7X4cmmMqlHEXs7SRKoSJKak4+0k5rH2JGqf+tNjCuP3qZknUl5SzWW85+eS0jCSy0sR7U2x981OFMdZeXlp8pZsBfG0kLUnf4wDdb3RmLwpazM6y1XhG2tqurk91KeDraZgEgB1JFg69z1dVr0XtkUMvIdaRQupeEqOLR0tvKPVW7cMU8RX5OolJV8wldqPW5IdMEfx6UfpQv7rrsKV0CkN5fD+lbF3C742emcnruEU/q6y/0Gdgl7DWMDmpWl6J8NYkTx9KjTHfCkiSsVGpAM0it5EzKpgqZZ20QWvD9bqw6RA/JA7k705sQTb95uH2MQ1oAtvvweJ4GjmGq1ZjBb63lS3p6Ge6fGhEyP9Csjohr8lL3dQMS9jrdQRkEx0MgdY2cPkKtn+baHFVuUT6ka6/SbAwIey+j3SxvyQsPnbxdUVjb2TcfV/Fb+H8oqlRwjfN+y2XrD+Llk2+OPKYAcaZEREPlwkSqt/68So0kp5GILG1N4qcFaakTO+R+ZxpfveW9Yk27tZblzLzv8p8wlSA2XrFU/x2SOU9JOTxLoFQCVfLmEdhit0tpUboBb0ef9lzTYFcC0vIbGX0/1mxTXyuF8Xn9U7i6kLsrXNSRh19GwJINzAcRZLykG/RiVfIXuRXuwbirxRnWBq0wzwncilDxc+ofRsOxJhl2TQRt4Ss8TYmc3n+h9ZNBexXNpLNcBfi8cGWsQ/JCfAQet07C5uvcWnPEkjoa00kBf1mTEjfKbhvRWHGhWsnJ10HkJVGvW+YowPVu/qI4ic3A/lUn42v38S9MXIlvHrOps/csUyRBk1NKdBC5HJi+YzxLOpxLBh8is8EC3D5Jcg2M0svXCDuX153H0L4tpOwXGtOVGFjT8OpkqKzEq4PY6KZ++En/5OCHv2Stflg6LIJR1hhyl8ZJoWEGn3VsQawDIJDgddRyQp+Z312ykfBf7Nzln1lWwSK+PCcrrgUaW3F0LJitDVfvtevcbVQwCsmsf8Nq0C/BuAJDUoi4udKAk7/BGKqMBKeQjJsUXDrHZ3lzyN3o3UyF+mJdCCFDetEDaMdVnUztszqp6KRf5yeuYRvfLxDZvm0mGxXq5nC35Hf8ufKrus5KeO0tz5a11N0+PiT1sN1f8pI//dKH2wfiU7kk2KKEiWNS/WMydo0fRyKi2YR4htcoOvIle67Le3S98oDTG3AizTjXmMdYEa2orCxJ6yuYPi3GOu+yf5c8Mr4JUitvbQIx3SWpfqRyV5Rnc0IbO2NratRcgwdgjaLD8qSBx+txdC7KQ7DKJnVk4zjo9bNL+UoXj4T6+CvTpCmXC+2R+7LD3z4CcSFA5ucbZTYAkcc8dO+egm6rHTscuNN6IKc4b+nzbaufsTIdzIwFgPVuy2j1EE+vOOw0qQK4SYDeKMcqoB3QNgXYNdPNSUVVQmGp04jqmggWcM433CxeodjG1/8CY9OhRl9GBy6L16g6UllEKwYhkPZ0zK1B/jZMmfoDokySsCNhUMORcW1o9tqXymUbtQK/HLRSzlVVFE02ShK17YKFNh3lQzMIx2cQN67vp3YS6ayxz3U8QmejwArpc5ykq5ObZEsgF9EMQraMbQgwDJTOtQXwlEVILvzZj+bhZTKSgaCjs+i9PNMPIdpQ+ISwlJZWodeYnClH0nmTie9MVn5bknhks5k3EYAzUnfHrM/ddcUCtPaxDe2CR6GThYcnOPbpr3cloWfCRNIJ8NpZr5Y4oWF8b44SBWQkGkrgOeHNX+Ysfi34ObER27GxlBhb6vjud+r7xIO+zKE4MXElT6hFOqRzgcJQzx5+ZD+y+aM5EYozII49t4t7Mrdx8eGoHl25O7vQRGuLTD9/JYh7cALRjm3EaXDocx2XEorT5yfxDIdEm3HYaxEX5LWxbSlK3YinjAYX9Dw7ub0TKM18RTHPsVhjVOenXtTegtbtBUVO8auL31tOkQL3sGvPh4JDvhSJUjXlarY7X7pqro1gvjWTkI5Z5+JPpMhDUb4RFdlgdOND54Dl+vhMzFnYpBWYhhi0HdGIpNJ9ZAenz0wyyWd4mGoI45+boSyM7e+ubjCKxp0WL2witEVRx034VW0wHYxTc/ZhvT491WCMY0txJZmtIFGB686gDm3EvMUEZgPHW6LwN4QmHEdi0nob33kDLvunQwsvC4tTatm4QCah9J+rtZb3lKux1DYee/kLc3orRV0UStTuFdPfA9/7pzuIrJPygyQcf7R836v/xllfTqOeJTM/aMmRrDmHNDpC4hIF6wyfZnpeRFOxz9PpZ9HJabocPGaS3k6EB0gxsvqcnQg3GEO73lRAKZK7OlizPbmlqNlw/6Dc0ZQsm1MeSJNvyBpnV9P2Wt7EwbzFf3oGlFoZPELYf5e/eJIij5iSYnuLE2JAB6dyF/6PUltcu2dpTtPfjI0z0Ux0+l8bqUvl1V8HAyLJxDPicsiJzcIBAYbWRXNJcSFUBG2t/r+DVwLDDutL8e3QSJU6Ppgi5ajQtDU3PLKvStIjhekFGoFC4SiRX/Hrei0x48ZTYK/qRbSDiEnKEgx8QQIOMK9lVafC+CEYiqbb+msvf/E7s7jI8AF8nouUztjRkeMIj7cY0NN0rVq8fMLjVcCt8ghSWeVjhc9q3zP4QvWormvz8BxF3spvau2BNcG7vYT7Xwv6JX2eMn3oyHfOLEFsXguVolMcD5/U6Cu2hh0FfwIsLsniHGiHA2bKo9eWXOHj+3YVFQpINH5glyD/kvJW9dNtbNG4lHmFdaaEDz2K7VmtVyI2Kbd1TItgDcQ4FGYb/Ew4sRnkal6Rdz5Pva10aAN9tvogVsVOXe8k4GlS8GD0eSHaY5ND6srVZ4pI9yWr8whzswyZePSH2t4spYnN7yNhbUHOuGf++A+c90nXiSwW/zZF5GSQbd7ybbjp8nycrsSZXqomRudf1eHcseRIm5FnpIt7mGnij9UtacMdD/bj3X8Ru3jNl3aP8jtcJZ/n34ObxJeQ41lVtAbfK1z/w0hlg8l7ITuglHxL+nhUcPJ+QJpG0EIzREeata4dLF8C35sBMO02OYeAz6m2+m4d9J2woWnWPNe2oY3kiUINaGtwcV9vFn/qEPIuoTKG5XKQoB5QZtPRrDtJ0GcpV2PkJL/9TIpmFODPmO45f4uhMIgisnQ2SYIMEcXcO/+w3p1tDfrWnOLTf/ZNiiMprALncFD0VVZpw8avhC7oJnz2ODK/Zpqx2Rueq9jkLZBJPun9wpDCK42n5Nr9o830WYV74ETXQVF+9wSNZ8WodYN4qMFgJN8R2kwlD59f9/+Pgjh+cwLLY+987oJpN0JLQM7jwkQptDA7GEaj+jkHnNrMCWHcUIlKVMoTPRif8YGZ2Lu/+Kx3aryVqNkTZKvTCpXjeGHBoc8s3l8eEA6iBg1U/p1MdtUUTdWkxhaVONMeOLcYPC6bQjD4UNV2sasdyik+TiDEsiROrgkHm73dUM22K+JRIZ3GmdaGhCqghAhzBDJAw8oX72SSCreiDYhX8VMo19LRg9GT4ZB+q4yrXfaL7YSpof7ylSz09jWRgr8KHKmWQ6cekYIM/NQR6B4sNhipEdcFVt/dUrb8Zee56c1clggA+HHK/2jumVhr+aVv3F6G1XN8UQAzNwTTF6hY2koDxmX/TJePwqEKsZFgVJjQwHS75LUqPQSFe+Q9GtqmRY2ZDxsgh78u958xN/3p/T1M2R3CZbKlR86gl541ue0kBu+b477FxvqKsRmlyw1G6x4Oqk5YtJG1cyKyLuvtrmQzf1xcAQF6dG+BafADg1MDrvyBLcMFXObUDWnjriZ8EohYWEeaO7gHCPbg/kk/syoYRfk9HVg9MYseNS/7v5bIektkqi9/oI/g41eA8dWU2FpFtnkEvRHxPmUpto0/qJjv61e+8TbXTR5pdQCooRFASqS55kcZRIBnCpjekKLY9OkOF5PNDAPsEosLsRM6Jc+AVhO+89AnP63e6tr/TBAFTGelQBM5OFCRWBKvp0yiSxmmAE+G0Sh0GHHH2Vk07CS+cThRPyQveYCxQYtwPGo4euz0fCuMVKO6sI21MOG/Nk6ft+AH3NTZlxCLnFUaPj6UOzd7+4s8gpmJ601MOmf+nLKG2sqqwE1VJUYGVmUyv3f7+IRG9hn/IPIyXxsFfFKIwv/+MvH6m6dIejNBZv5RW5rc1HLvoN7XK1MYSZlcWOOViP6JgSXcdyDMYGfk5c9FqQstsicNQKcF5YqBpZ3sDGCd+OuaUH9tP5H4PNOpg5i0SRAd7tBynVmyCeoyNZxmOSLY4ftx4+wmm6w09swE7gZQOy0HI3OsJ+p0kdQtCIf1ZPvXirzGvSipSvqll1wFoOKCrbWXNFZfECdJcDbFTaAJ4BbRYKjr0/mkdFRqXANifoqW4DP7tkFo0sAbERh41n9LCo7ULjxdfjkiwOBv9oh6YFWoiRpgcDJO2gscktBY4ygYcq2aaqJ42dwuLSbJQih+wIPt3W+OAf9ZNOFZud96X6CggwjABhoIoxKI6UWnYvmcCNvUpnaX3j4N/jooILOM5Yta+/HWGxL+oq13IvJbJRkUAgdaLAfEu+VYB1SKybQxd411V/52s5BfV3O7EfzjGT5R4i7Cg6xWWLGj8/uPq0gmzC4n35kBfyQJtR7etwWWIHthKgolvrQvxtS/cq70sIfaQ4P9xfWSK36I4nR4Ap45q0VqbENzF+1YaKdjMEZwx8znxuNTeRJCBjtPXygNiJtGPFiCwADtDLqrGhczUhGGplalNwCd/hJ720CJ74XOKA/eCkifgFNmH51KniZJF478GYEqrhRraHmoew5F3ffAjVO7aniVY1jghWcCVyqAi2JqmF6Zgw1VNwzwGRBh/7KDKzkD54TJ6fF7HJ3OHBRdWAmXtkMnlaef88klzDaRB6Y2NKkkeB/Fam17lXuVMCKEgTye6TXUSKjV4xvqXtLhYF2J4TAlzeMx9koxi+ALs6Dpzn6Ty446cbKG0JwU1VIs+hMtrJax4dD1U53oGrIW7FcSeQEg8EwrgqjP5FCNsebdhsmacTgOenLSkdrhl1dddlkrKpYK7+MoyUaCU5P5dYI5wVstI2d0gUlBmJsUl/Oh3+Jj7M6ZZSUVj0QyoLdtcc1EWoQ4jUVSIA8sGXG5rPP9NhVZEIHxA35uGUZGKV1roDZ+13MK1t8t+bhOe0vRRW66Du9s5I9fFRGM9KIYlYUPOZYxPmzaTkG0SFkMWGpEPFbnIRzMIYI0AtWtQ89PCj3zz6OSriU+PLeFXioYxHLVXpBO4uYXtSDmZdGGv/R+/2NoNZF6X9FR5Oji0M9+BO0sxfMLitvDZ/kxRWLfUjsBb9AC+MOwswkT6f8ESJ08H6jzGmD099EOXWpJlHbT2gcyoOoUbTxqC4M22gWCBJUhpP2BLw6Cw6B14z08qWzjh7NNKEYXxqkAkBcdk/q/E839mi+hqfsgBHw+7JfVJ9s8yrMVsv4jCYi/ToXhTbEHCgM+fB0ZA+TroraqOW0r2Q8rJXEY2psxWZXgm/eV0ga07tZWleIlZKXjhouGizvOo4rAJSYpV1xVU+pdS5yesg/6WbnxhcKL1LoZ99MRgGt6djw++UlIzBeHkBi1hR5rmqyV1+XO81vWqxTBVcT83cmZGZghHi1uAXeidYC/XI2XDznBoflV9cLeb84zejMD5js5ng948WalbiJ0Z+JG2r73yL2MHL4EsSv5C+FqNSkiPhx8M6nCFaAZ6/rUwS4imPJSKLVbJes0z4eNXm0hZNGc2EKezjwP/UKY2tKUEsVHcuxGG2m6INo5WtZ67KIOnjqkm/8QNae8MPv1ozXf44wDA/J+e0Hrxk1GF2omtT15yV54WpO/Ye/vWwp10yq3A/Z9giphFgDHGllC4LiUnMILbqSTPpZUoel35cHLDyBK6eOFesP/AubHFCD35V6SB9Inrcu+yrbLVQDThd0KwAR3D7fs0glLlmw/+ghZGi3YLg1ZUigLua1BExYyjYhiyJS5yKGJtygEdaqOdSbtEjug5KuLCy2xLLX5MGKAqwncwfhipxBVwIZI3yHgkAmOaTDe7GdtU/s/EIeGuZe1gMOrfQBbYJAiV7vTnP3QD00KboHiwYK6s/9yU20pr2tc20nH706jjf/mX20jyJHT63S2nw/gN0xNJVZ2IA1q5fuqqe8bWsgE4vLMzeZyPsES6IT/KPjmJlXMBcGwyBxqr8EbzxYPYiUBn9hSwC+fOaSbx4ZFlyLcus74kakoRhOO73AvZv3g9UKGsFDrwoWsMaOg/LmiBzJfZemBHgX0lGbqYBPrDY5ZLh18JGp4U4iLyLghHpX0/1bZ8kD4uhByGhNdRljl8c/JVyslSKI72wr9kgofl8YQZ9NoL+dNiOfZueoM7t8xPVM7pi+f/68na/jdLg6Tnnw5BJc3sHvx/rFVKlP/rSuPO7DM0ziaIND9Ua0PNovuujWfjE6sBUID8W5Wx8/GOhry5Ku3qNioAXJ4/+FsxAvAZhEUKpdCFmgLKoxiUdZ8Ip6S38Yeu/2UJTub+saEoQn+km7koMVEHzpsCT4ANgUow55sUPc5Cp7ehu2HOI48qWp+fG/Ams34nFeVIbZtuU7QdtcdU/yB906xwX+wAA6qQi4Lo0U13EWG7SGnCDKnF6hDnkTwpFD3UrvNGP5XKLcd1MbWxkytUkcbWJVIJKwzy5IP7OH9PM5vNPTy7DbBdQuvLrxlxG2Woh9OChwIvARmLvWBzLjSdFKmqSyaprL2YXiQB0K9T0x9if8O2iTwErrO0+dlBxswkzYvjijbqD3TGPGGJRIgsZjHMKtYyjPhPDkFKQl5ghOTNsd78PLvVS/shYMqk74Gtms+cushRB+swO4zBea+0oubo4DIDWzl0FJ5sIkh8/nuvzpfhzKT6mhkgvQv5Lcp3vSuhl6nKt5LG7Gk0+SWRe9suVMmcpcPyfzMilxVZZHrd+Rc/ODICHIn7w6j8XHVJgcvvNKriNnGA4C1dQzdS6QQSOnmIbBtEnbhGbE2A3OnQDEjxIxFeE4SfP2POxwIxCBSP5/SFxuKoInI2ruguKkpO/GQ0b3ZgAdfGY2c9744HMz4HToV2xxsnM3+UB4g1tAV2Iwa04fNG31IRA1TQF33s4SJIoPhWMEXnmnQAvMIZTMEkfE56rxG21vcWWGVqrYWWzJSRWMxa/v4mlZEtrN2xghjiM0AjpM0HI49y44dmRWzfpnTzpHR/UXJp36PXC5yj/iwTizK+hnJj3UK4qcmVqtnwiApw6lXBf7tkQNFQGkNMjze6ESEAAA=';

const pages = [
  ['home','Home',Home],
  ['gamehub','Game Hub',CalendarDays],
  ['newsroom','Newsroom',Newspaper],
  ['podcast','Podcast',Headphones],
  ['offseason','Off-Season',Target],
  ['career','Career',UserRound],
  ['chronicle','Chronicle',BookOpen],
];


const PAGE_VISUAL_STORAGE_KEY = 'dynastyhq-preview-page-visuals-v1';
const PROFILE_PHOTO_STORAGE_KEY = 'dynastyhq-preview-career-profile-photos-v1';
const PODCAST_ARTWORK_STORAGE_KEY = 'dynastyhq-preview-podcast-artwork-v1';

const PREVIEW_VIEW_STORAGE_KEY = 'dynastyhq-preview-view-v1';

const previewPublicationIdFor = (entry) => String(entry?.publicationId || entry?.id || '').trim();

const previewWeekLabelFor = (state = {}, season = 1, week = 0) => {
  const schedule = (state.seasonSchedules || []).find((entry) => Number(entry?.season || 1) === Number(season)) || {};
  const entries = Array.isArray(schedule.entries)
    ? schedule.entries
    : (Array.isArray(schedule.games) ? schedule.games : (Array.isArray(schedule.schedule) ? schedule.schedule : []));
  const row = entries.find((entry) => Number(entry?.week) === Number(week)) || null;
  if (row) return scheduleDisplayLabel(row);
  if (Number(state.currentSeason || 1) === Number(season) && Number(state.currentWeek || 0) === Number(week)) {
    const setupLabel = String(state.currentWeekSetup?.label || state.currentWeekSetup?.customLabel || '').trim();
    if (setupLabel) return setupLabel.toUpperCase();
    const pending = postseasonPendingLabel(state);
    if (pending) return pending;
  }
  return `W${week}`;
};

const PREVIEW_MASTER_AUDIO_MAX_BYTES = 30_000_000;
const PREVIEW_MASTER_AUDIO_EXTENSIONS = new Set(['mp3','m4a','wav','aac','ogg']);
const PREVIEW_MASTER_AUDIO_DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'option-a-master-audio';
const PREVIEW_WEEK_PROCESSOR_DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'option-a-week-processor';
const PREVIEW_NEWSROOM_PHOTO_DEVICE_ID = globalThis.crypto?.randomUUID?.() || 'option-a-newsroom-photo';

const previewAudioMimeFor = (file) => {
  const supplied=String(file?.type || '').trim().toLowerCase();
  if(supplied.startsWith('audio/')) return supplied;
  const extension=String(file?.name || '').trim().toLowerCase().split('.').pop();
  if(extension==='m4a') return 'audio/mp4';
  if(extension==='wav') return 'audio/wav';
  if(extension==='aac') return 'audio/aac';
  if(extension==='ogg') return 'audio/ogg';
  return 'audio/mpeg';
};

const previewAudioFileAllowed = (file) => {
  const type=String(file?.type || '').trim().toLowerCase();
  const extension=String(file?.name || '').trim().toLowerCase().split('.').pop();
  return type.startsWith('audio/') || PREVIEW_MASTER_AUDIO_EXTENSIONS.has(extension);
};

const previewFileToBase64 = (file) => new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(reader.error || new Error('DynastyHQ could not read that audio file.'));
  reader.onload=()=>{
    const value=String(reader.result || '');
    const commaIndex=value.indexOf(',');
    if(commaIndex<0) reject(new Error('DynastyHQ could not prepare that audio file.'));
    else resolve(value.slice(commaIndex+1));
  };
  reader.readAsDataURL(file);
});

const previewAudioDurationForFile = (file) => new Promise((resolve)=>{
  if(!file || typeof document==='undefined') return resolve(0);
  const audio=document.createElement('audio');
  const objectUrl=URL.createObjectURL(file);
  let settled=false;
  const finish=(value)=>{
    if(settled) return;
    settled=true;
    window.clearTimeout(timer);
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(objectUrl);
    resolve(Number.isFinite(Number(value))?Number(value):0);
  };
  const timer=window.setTimeout(()=>finish(0),12000);
  audio.preload='metadata';
  audio.onloadedmetadata=()=>finish(audio.duration);
  audio.onerror=()=>finish(0);
  audio.src=objectUrl;
});

const formatPreviewClock = (seconds) => {
  const safe=Math.max(0,Number(seconds)||0);
  const mins=Math.floor(safe/60);
  const secs=Math.floor(safe%60);
  return mins+':'+String(secs).padStart(2,'0');
};

const downloadPreviewText = (contentValue,fileName,type='text/plain') => {
  const blob=new Blob([String(contentValue || '')],{type});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};

const NOTEBOOK_CANONICAL_GAME_KEYS = new Set([
  'game.opponent','game.result','game.homeScore','game.awayScore',
  'game.passYds','game.passTD','game.rushYds','game.rushTD','game.int',
  'game.teamTotalYards','game.opponentTotalYards','game.teamFirstDowns','game.opponentFirstDowns',
  'game.teamTurnovers','game.opponentTurnovers','game.teamRushYds','game.opponentRushYds',
  'game.teamPassYds','game.opponentPassYds','game.teamPossession','game.opponentPossession',
]);

const notebookNormalizeToken=(value)=>String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,' ')
  .trim();

const notebookIsRtgFact=(fact)=>{
  const key=String(fact?.key || '').toLowerCase();
  const label=String(fact?.label || '').toLowerCase();
  return key.startsWith('rtg.')
    || key==='profile.player.overall'
    || key.startsWith('player.development')
    || /\b(overall|ovr|coach trust|skill points?|energy|gpa|wear|followers?|brand|nil|depth chart|development|progression|regression)\b/i.test(label);
};

const notebookIsScoringFact=(fact)=>(
  /(?:^|\.)scoring(?:\.|$)/i.test(String(fact?.key || ''))
  || /scor|touchdown|field goal|extra point|drive/i.test(`${fact?.label||''} ${fact?.evidence||''}`)
);

const notebookIsCanonicalStatDuplicate=(fact,data={})=>{
  const key=String(fact?.key || '');
  if(NOTEBOOK_CANONICAL_GAME_KEYS.has(key)) return true;
  const label=notebookNormalizeToken(fact?.label || key);
  const category=notebookNormalizeToken(fact?.category || fact?.sourceType || '');
  const subject=notebookNormalizeToken(fact?.subject || fact?.player || '');
  const playerName=notebookNormalizeToken(data?.player?.name || '');
  const statLike=/\b(score|result|points|total offense|total yards|passing yards|pass yards|passing touchdowns|pass td|rushing yards|rush yards|rushing touchdowns|rush td|interceptions|first downs|turnovers|possession)\b/.test(label);
  if(!statLike) return false;
  if(playerName && (subject===playerName || (subject && (playerName.includes(subject) || subject.includes(playerName))) || label.includes(playerName))) return true;
  if(/team|game/.test(category)) return true;
  if(!subject && /score|result|points|total offense|first downs|turnovers|possession/.test(label)) return true;

  const factValue=notebookNormalizeToken(fact?.value ?? fact?.displayValue ?? fact?.text ?? '');
  const game=data?.game || {};
  const team=game?.team || {};
  const school=notebookNormalizeToken(data?.player?.school || '');
  const opponent=notebookNormalizeToken(game?.opponent || '');
  const subjectIsCanonicalEntity=!subject
    || (playerName && (subject===playerName || playerName.includes(subject) || subject.includes(playerName)))
    || (school && (subject===school || school.includes(subject) || subject.includes(school)))
    || (opponent && (subject===opponent || opponent.includes(subject) || subject.includes(opponent)));
  const canonicalValues=[
    [/passing yards|pass yards/,game.pass],
    [/passing yards|pass yards/,team.passYards],
    [/passing yards|pass yards/,team.opponentPassYards],
    [/rushing yards|rush yards/,game.rush],
    [/rushing yards|rush yards/,team.rushYards],
    [/rushing yards|rush yards/,team.opponentRushYards],
    [/passing touchdowns|pass td/,game.passTD],
    [/rushing touchdowns|rush td/,game.rushTD],
    [/interceptions/,game.interceptions],
    [/total offense|total yards/,game.total],
    [/total offense|total yards/,team.totalYards],
    [/total offense|total yards/,team.opponentTotalYards],
    [/first downs/,team.firstDowns],
    [/first downs/,team.opponentFirstDowns],
    [/turnovers/,team.turnovers],
    [/turnovers/,team.opponentTurnovers],
  ];
  if(subjectIsCanonicalEntity && factValue && canonicalValues.some(([pattern,value])=>(
    value!==null && value!==undefined && value!==''
    && pattern.test(label)
    && notebookNormalizeToken(value)===factValue
  ))) return true;
  return false;
};

const notebookUniqueFacts=(facts=[])=>{
  const seen=new Set();
  return facts.filter((fact)=>{
    const subject=notebookNormalizeToken(fact?.subject || fact?.player || '');
    const team=notebookNormalizeToken(fact?.team || '');
    const label=notebookNormalizeToken(fact?.label || fact?.key || '');
    const value=notebookNormalizeToken(fact?.value ?? fact?.displayValue ?? fact?.text ?? '');
    const signature=[team,subject,label,value].join('|');
    if(!label && !value) return false;
    if(seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

const notebookFactLine=(fact,index)=>{
  const subject=[fact?.team,fact?.subject || fact?.player].filter(Boolean).join(' · ');
  const label=String(fact?.label || fact?.key || ('Context '+(index+1)));
  const value=fact?.value ?? fact?.displayValue ?? fact?.text ?? fact?.evidence ?? '';
  return '- '+(subject ? subject+' · ' : '')+label+': '+String(value);
};

const notebookSourcePackText = ({data,episode,facts=[]}) => buildNotebookLmProducerPack({data,episode,facts}).text;

const PREVIEW_NUMERIC_GAME_FIELDS = new Set([
  'homeScore','awayScore','teamRank','opponentRank','passYds','passTD','rushYds','rushTD','int',
  'teamTotalYards','opponentTotalYards','teamFirstDowns','opponentFirstDowns','teamTurnovers','opponentTurnovers',
  'teamRushYds','opponentRushYds','teamPassYds','opponentPassYds',
]);

const previewCleanFact = (fact) => {
  const { selected, ...rest } = fact || {};
  return { ...rest };
};

const previewTypedValue = (key,value) => {
  if(value===null || value===undefined) return '';
  const field=String(key || '').replace(/^game\./,'');
  if(PREVIEW_NUMERIC_GAME_FIELDS.has(field) || /^rtg\.(?:gpa|energy|coachTrust|trustToNext|skillPoints|followers|valuation|weeklyPoints|examWeeks|nextFanMilestone|nilWeeklyCost|openNilSlots)$/.test(String(key || ''))){
    const parsed=Number(String(value).replace(/[$,%]/g,''));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return typeof value==='string' ? value.trim() : value;
};

const previewGameFromFacts = ({baseGame={},facts=[],fallbackOpponent=''}) => {
  const nextGame={...baseGame};
  if(!nextGame.opponent && fallbackOpponent) nextGame.opponent=fallbackOpponent;
  facts.forEach((fact)=>{
    const key=String(fact?.key || '');
    if(!key.startsWith('game.')) return;
    nextGame[key.slice(5)]=previewTypedValue(key,fact.value);
  });
  return nextGame;
};

const previewRtgFromFacts = (baseRtg={},facts=[]) => {
  const nextRtg={...baseRtg,wear:{...(baseRtg?.wear || {})}};
  facts.forEach((fact)=>{
    const key=String(fact?.key || '');
    if(!key.startsWith('rtg.')) return;
    const field=key.slice(4);
    if(field.startsWith('wear.')){
      const part=field.slice(5);
      if(part) nextRtg.wear[part]=previewTypedValue(key,fact.value);
      return;
    }
    nextRtg[field]=previewTypedValue(key,fact.value);
  });
  return nextRtg;
};

const previewMatchesPublication = (entry,publicationId,season,week) => (
  entry?.publicationId===publicationId
  || entry?.id===publicationId
  || entry?.weekKey===publicationId
  || (Number(entry?.season || 1)===Number(season) && Number(entry?.week)===Number(week))
);

const mergeVerifiedPublicationFacts = (state,publicationId,facts=[]) => {
  if(!facts.length) return state;
  const existing=(state.factLedger || []).filter((entry)=>entry?.publicationId===publicationId && entry?.editorialOnly!==true);
  const map=new Map(existing.map((entry)=>[entry.key,entry]));
  facts.forEach((fact,index)=>{
    const cleanFact=previewCleanFact(fact);
    const key=String(cleanFact.key || '').trim();
    if(!key) return;
    map.set(key,{
      ...(map.get(key)||{}),
      ...cleanFact,
      id:cleanFact.id || map.get(key)?.id || `${publicationId}:preview-${index}`,
      key,
      value:previewTypedValue(key,cleanFact.value),
      verified:true,
      userVerified:true,
      publicationId,
      correctedAt:new Date().toISOString(),
    });
  });
  const preserved=(state.factLedger || []).filter((entry)=>entry?.publicationId!==publicationId || entry?.editorialOnly===true);
  return {...state,factLedger:[...preserved,...map.values()]};
};

const applyCorrectedRtgSnapshot = (state,{publicationId,season,week,facts=[]}) => {
  if(!facts.length) return state;
  const weeklyUpdates=[...(state.weeklyUpdates || [])];
  const targetIndex=weeklyUpdates.findIndex((entry)=>previewMatchesPublication(entry,publicationId,season,week));
  if(targetIndex<0) return mergeVerifiedPublicationFacts(state,publicationId,facts);

  const previousSnapshot=[...weeklyUpdates]
    .slice(0,targetIndex)
    .reverse()
    .find((entry)=>hasRtgSnapshot(entry?.rtgSnapshot || {}))?.rtgSnapshot || {};
  const currentSnapshot=hasRtgSnapshot(weeklyUpdates[targetIndex]?.rtgSnapshot || {})
    ? weeklyUpdates[targetIndex].rtgSnapshot
    : previousSnapshot;
  const patchedSnapshot=createRtgSnapshot(previewRtgFromFacts(currentSnapshot,facts));
  weeklyUpdates[targetIndex]={
    ...weeklyUpdates[targetIndex],
    rtgSnapshot:patchedSnapshot,
    rtgChanges:diffRtgSnapshots(patchedSnapshot,previousSnapshot),
    correctedAt:new Date().toISOString(),
  };

  const hasLaterSnapshot=weeklyUpdates.slice(targetIndex+1).some((entry)=>hasRtgSnapshot(entry?.rtgSnapshot || {}));
  const changedAt=new Date().toISOString();
  const next={
    ...state,
    weeklyUpdates,
    ...(hasLaterSnapshot ? {} : {rtg:{...(state.rtg || {}),...patchedSnapshot,wear:{...(state.rtg?.wear || {}),...(patchedSnapshot.wear || {})}}}),
    newsroomIssues:(state.newsroomIssues || []).map((issue)=>previewMatchesPublication(issue,publicationId,season,week)
      ? {...issue,...(issue.editorialStatus==='generated'?{editorialStatus:'needs-regeneration'}:{}),rtgCorrectedAt:changedAt}
      : issue),
    podcastEpisodes:(state.podcastEpisodes || []).map((episode)=>previewMatchesPublication(episode,publicationId,season,week)
      ? {
          ...episode,
          ...(['scripted','ready','published'].includes(episode.status)?{status:'needs-regeneration'}:{}),
          ...(episode.audioStatus==='ready'?{audioStatus:'stale'}:{}),
          rtgCorrectedAt:changedAt,
        }
      : episode),
  };
  return mergeVerifiedPublicationFacts(next,publicationId,facts);
};

const appendOfficialNetworkArticles = (state,{publicationId,season,week,articles=[]}) => {
  if(!articles.length) return state;
  const current=[...(state.eaSportsNetworkArticles || [])];
  const signatureFor=(article)=>[
    article?.publicationId || publicationId || '',
    String(article?.headline || '').trim().toLowerCase(),
    String(article?.body || '').trim().slice(0,160).toLowerCase(),
  ].join('|');
  const indexBySignature=new Map(current.map((entry,index)=>[signatureFor(entry),index]));
  let changed=false;

  articles.forEach((article,index)=>{
    const normalized={
      publicationId,
      season:Number(season)||1,
      week:Number(week)||0,
      headline:String(article?.headline || 'EA SPORTS Network article').trim(),
      body:String(article?.body || '').trim(),
      byline:String(article?.byline || '').trim(),
      pageLabel:String(article?.pageLabel || '').trim(),
      sourceFileName:String(article?.fileName || article?.sourceFileName || '').trim(),
      screenshotUrl:String(article?.screenshotUrl || '').trim(),
      screenshotStoragePath:String(article?.screenshotStoragePath || '').trim(),
      screenshotMimeType:String(article?.screenshotMimeType || '').trim(),
      screenshotSizeBytes:Number(article?.screenshotSizeBytes)||0,
      pageCount:Number(article?.pageCount)||0,
      sourcePages:Array.isArray(article?.sourcePages)?article.sourcePages:[],
      capturedAt:String(article?.capturedAt || new Date().toISOString()).trim(),
    };
    const signature=signatureFor(normalized);
    const existingIndex=indexBySignature.get(signature);
    if(existingIndex!==undefined){
      const existing=current[existingIndex] || {};
      const merged={
        ...existing,
        ...Object.fromEntries(Object.entries(normalized).filter(([,value])=>value!=='' && value!==0)),
        capturedAt:existing.capturedAt || normalized.capturedAt,
      };
      if(JSON.stringify(merged)!==JSON.stringify(existing)){
        current[existingIndex]=merged;
        changed=true;
      }
      return;
    }
    const entry={
      id:`${publicationId}-ea-network-${Date.now()}-${index}`,
      ...normalized,
    };
    indexBySignature.set(signature,current.length);
    current.push(entry);
    changed=true;
  });

  return changed ? {...state,eaSportsNetworkArticles:current} : state;
};

const loadPreviewViewState = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw=window.localStorage.getItem(PREVIEW_VIEW_STORAGE_KEY)
      || window.sessionStorage.getItem(PREVIEW_VIEW_STORAGE_KEY)
      || '{}';
    const saved=JSON.parse(raw);
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};

const savePreviewViewState = (state) => {
  if (typeof window === 'undefined') return;
  const serialized=JSON.stringify(state);
  try {
    window.localStorage.setItem(PREVIEW_VIEW_STORAGE_KEY,serialized);
  } catch {
    // Fall back to session storage if persistent storage is unavailable.
  }
  try {
    window.sessionStorage.setItem(PREVIEW_VIEW_STORAGE_KEY,serialized);
  } catch {
    // View persistence is convenience-only; never interrupt the site if storage is unavailable.
  }
};

const NOTIFICATION_STATE_STORAGE_PREFIX='dynastyhq-redesign-notifications-v1:';

const loadNotificationState=(scope='guest')=>{
  if(typeof window==='undefined') return {readIds:{},dismissedIds:{}};
  try{
    const saved=JSON.parse(window.localStorage.getItem(NOTIFICATION_STATE_STORAGE_PREFIX+scope) || '{}');
    return {
      readIds:saved?.readIds && typeof saved.readIds==='object' ? saved.readIds : {},
      dismissedIds:saved?.dismissedIds && typeof saved.dismissedIds==='object' ? saved.dismissedIds : {},
    };
  }catch{
    return {readIds:{},dismissedIds:{}};
  }
};

const saveNotificationState=(scope='guest',state={})=>{
  if(typeof window==='undefined') return;
  try{
    window.localStorage.setItem(NOTIFICATION_STATE_STORAGE_PREFIX+scope,JSON.stringify({
      readIds:state?.readIds || {},
      dismissedIds:state?.dismissedIds || {},
    }));
  }catch{
    // Notification persistence is convenience-only; never interrupt DynastyHQ if browser storage is unavailable.
  }
};

const followerViewIdFromLocation = () => {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('follow') || '';
};

const buildFollowerSnapshot = (data = {}) => {
  const player=data.player || {};
  const game=data.game || {};
  const career=data.career || {};
  const totals=data.totals || {};
  const news=data.news || {};
  const podcast=data.podcast || {};
  const honors=Array.isArray(career.honors) ? career.honors.slice(0,8) : [];
  const timeline=Array.isArray(career.timeline) ? career.timeline.slice(0,8) : [];

  return {
    version:1,
    updatedAt:new Date().toISOString(),
    player:{
      name:String(player.name || 'DynastyHQ Career'),
      number:String(player.number || ''),
      pos:String(player.pos || ''),
      school:String(player.school || ''),
      overall:player.overall ?? '',
    },
    season:Number(data.season)||1,
    week:Number(data.week)||0,
    game:{
      week:Number(game.week)||0,
      opponent:String(game.opponent || ''),
      result:String(game.result || ''),
      us:Number(game.us)||0,
      them:Number(game.them)||0,
      pass:Number(game.pass)||0,
      rush:Number(game.rush)||0,
      total:Number(game.total)||0,
      passTD:Number(game.passTD)||0,
      rushTD:Number(game.rushTD)||0,
      td:Number(game.td)||0,
      interceptions:Number(game.interceptions)||0,
    },
    next:{
      week:Number(data.next?.week)||0,
      opponent:String(data.next?.opponent || ''),
    },
    totals:{
      passYds:Number(totals.passYds)||0,
      rushYds:Number(totals.rushYds)||0,
      passTD:Number(totals.passTD)||0,
      rushTD:Number(totals.rushTD)||0,
      interceptions:Number(totals.interceptions)||0,
      appearances:Number(totals.appearances)||0,
    },
    career:{
      stage:String(career.stage || 'Road to Glory'),
      record:{
        wins:Number(career.record?.wins)||0,
        losses:Number(career.record?.losses)||0,
      },
      appearances:Number(career.appearances)||0,
      honors:honors.map((honor,index)=>({
        id:String(honor.id || index),
        name:String(honor.name || honor.title || 'Career honor'),
        year:String(honor.year || honor.season || ''),
      })),
      timeline:timeline.map((entry,index)=>({
        id:String(entry.id || index),
        season:Number(entry.season)||1,
        week:Number(entry.week)||0,
        title:String(entry.title || 'Career milestone'),
        summary:String(entry.summary || ''),
      })),
    },
    news:{
      headline:String(news.headline || ''),
      dek:String(news.dek || ''),
      outlet:String(news.outlet || ''),
      photoUrl:String(news.weeklyPhoto?.url || news.article?.photo?.url || ''),
    },
    podcast:{
      title:String(podcast.title || ''),
      summary:String(podcast.summary || ''),
      duration:String(podcast.duration || ''),
      audioReady:Boolean(podcast.audioReady),
    },
  };
};

function useFollowerSnapshot(viewId){
  const [snapshot,setSnapshot]=useState(null);
  const [status,setStatus]=useState(viewId?'loading':'idle');

  useEffect(()=>{
    if(!viewId || !db){
      setSnapshot(null);
      setStatus(viewId?'error':'idle');
      return undefined;
    }
    const publicRef=doc(db,'artifacts',productionAppId,'public','data','shared_dynasties',viewId);
    return onSnapshot(publicRef,(docSnap)=>{
      const next=docSnap.exists() ? docSnap.data()?.redesignFollower : null;
      setSnapshot(next || null);
      setStatus(next?'ready':'missing');
    },()=>{
      setSnapshot(null);
      setStatus('error');
    });
  },[viewId]);

  return {snapshot,status};
}

const PAGE_VISUAL_POSITIONS = {
  home:'59%',
  gamehub:'52%',
  newsroom:'50%',
  podcast:'72%',
  offseason:'50%',
  career:'50%',
  chronicle:'72%',
};

const defaultPageVisual = (pageId) => ({
  image:playerPhoto,
  position:PAGE_VISUAL_POSITIONS[pageId] || '50%',
  custom:false,
  mode:['home','gamehub','newsroom','podcast','chronicle'].includes(pageId)?'auto':'manual',
  autoAvailable:false,
  sourceLabel:'Default player photo',
});

const loadPageVisuals = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved=JSON.parse(window.localStorage.getItem(PAGE_VISUAL_STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};

const loadProfilePhotos = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved=JSON.parse(window.localStorage.getItem(PROFILE_PHOTO_STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};

const loadPodcastArtwork = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved=JSON.parse(window.localStorage.getItem(PODCAST_ARTWORK_STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};

const compressSquareArtwork = (file) => new Promise((resolve,reject)=>{
  if (!file?.type?.startsWith('image/')) {
    reject(new Error('Choose a JPEG, PNG, or WebP image.'));
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('The cover image could not be read.'));
  reader.onload=()=>{
    const image=new Image();
    image.onerror=()=>reject(new Error('The cover image could not be opened.'));
    image.onload=()=>{
      const sourceWidth=image.naturalWidth||1;
      const sourceHeight=image.naturalHeight||1;
      const sourceSize=Math.min(sourceWidth,sourceHeight);
      const sourceX=Math.max(0,(sourceWidth-sourceSize)/2);
      const sourceY=Math.max(0,(sourceHeight-sourceSize)/2);
      const outputSize=Math.min(1000,sourceSize);
      const canvas=document.createElement('canvas');
      canvas.width=outputSize;
      canvas.height=outputSize;
      const context=canvas.getContext('2d');
      context.drawImage(image,sourceX,sourceY,sourceSize,sourceSize,0,0,outputSize,outputSize);
      let dataUrl=canvas.toDataURL('image/webp',.78);
      if (!dataUrl.startsWith('data:image/webp')) dataUrl=canvas.toDataURL('image/jpeg',.82);
      resolve(dataUrl);
    };
    image.src=reader.result;
  };
  reader.readAsDataURL(file);
});

const compressPagePhoto = (file) => new Promise((resolve,reject)=>{
  if (!file?.type?.startsWith('image/')) {
    reject(new Error('Choose an image file.'));
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('The image could not be read.'));
  reader.onload=()=>{
    const image=new Image();
    image.onerror=()=>reject(new Error('The image could not be opened.'));
    image.onload=()=>{
      const maxDimension=1200;
      const scale=Math.min(1,maxDimension/Math.max(image.naturalWidth||1,image.naturalHeight||1));
      const width=Math.max(1,Math.round(image.naturalWidth*scale));
      const height=Math.max(1,Math.round(image.naturalHeight*scale));
      const canvas=document.createElement('canvas');
      canvas.width=width;
      canvas.height=height;
      const context=canvas.getContext('2d');
      context.drawImage(image,0,0,width,height);
      let dataUrl=canvas.toDataURL('image/webp',.72);
      if (!dataUrl.startsWith('data:image/webp')) dataUrl=canvas.toDataURL('image/jpeg',.74);
      resolve(dataUrl);
    };
    image.src=reader.result;
  };
  reader.readAsDataURL(file);
});

const fallbackData = {
  player: { name:'BRYAN WESSEL', number:'6', pos:'QB', school:'OREGON', overall:'76', headshot:'' },
  season: 4,
  week: 10,
  game: { week:10, opponent:'ILLINOIS', result:'W', us:54, them:48, pass:286, rush:124, total:410, passTD:6, rushTD:1, td:7, interceptions:2, team:{points:54,totalYards:468,firstDowns:24,turnovers:0,rushYards:182,passYards:286}, scoring:{playCount:7,passTD:6,rushTD:1,opponentPoints:48,facts:[]} },
  next: { week:11, opponent:'MARYLAND' },
  rtg: { rank:'QB1', coachTrust:'' },
  news: { headline:'Wessel leads Oregon past Illinois', dek:'Oregon secures a 54–48 victory behind 286 passing yards, 124 rush yards and 7 total TD from Bryan Wessel.' },
  podcast: { title:'Illinois recap', duration:'28:14', previous:[], archive:[] },
  totals: { passYds:2846, rushYds:742, passTD:28, rushTD:9, interceptions:8, appearances:4 },
  navigation: { seasons:[4,3], weeks:[10,9] },
  selection: { season:4, week:10, hasGame:true, hasNewsroom:true, hasPodcast:true, isCurrent:true },
};

const teamBrandCache = new Map();

function Logo({team='Oregon', type=''}) {
  const teamName=String(team||'').trim() || 'Team';
  const [brand,setBrand]=useState(()=>teamBrandCache.get(teamName) || null);
  const [failed,setFailed]=useState(false);

  useEffect(()=>{
    let active=true;
    const cached=teamBrandCache.get(teamName);
    if(cached){
      setBrand(cached);
      setFailed(false);
      return ()=>{active=false};
    }
    resolveTeamBrand(teamName).then((next)=>{
      if(!active) return;
      teamBrandCache.set(teamName,next);
      setBrand(next);
      setFailed(false);
    }).catch(()=>{ if(active) setFailed(true); });
    return ()=>{active=false};
  },[teamName]);

  const src=!failed ? (brand?.logo || brand?.directLogo || '') : '';
  const fallback=(brand?.abbreviation || teamName.split(/\s+/).map((word)=>word[0]).join('').slice(0,3) || '?').toUpperCase();
  const style={
    '--team-primary':brand?.primaryColor || '#075c43',
    '--team-secondary':brand?.secondaryColor || '#f1df00',
  };

  return <span className={'team-logo '+type+(src?' real-logo':'')} aria-label={brand?.displayName || teamName} style={style}>
    {src
      ? <img src={src} alt="" onError={()=>setFailed(true)}/>
      : <span>{fallback}</span>}
  </span>;
}

function App(){
  const [followerViewId] = useState(()=>followerViewIdFromLocation());
  const followerView=useFollowerSnapshot(followerViewId);
  const [restoredView] = useState(()=>loadPreviewViewState());
  const validPage=pages.some(([id])=>id===restoredView.page) ? restoredView.page : 'home';
  const [page,setPage] = useState(validPage);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [mobileMoreOpen,setMobileMoreOpen] = useState(false);
  const restoredSeason=Number(restoredView.season);
  const restoredWeek=Number(restoredView.week);
  const hasRestoredSeason=Number.isFinite(restoredSeason) && restoredSeason>0;
  const hasRestoredWeek=Number.isFinite(restoredWeek) && restoredWeek>=0;
  const [season,setSeason] = useState(hasRestoredSeason?restoredSeason:4);
  const [week,setWeek] = useState(hasRestoredWeek?restoredWeek:10);
  const [articleOpen,setArticleOpen] = useState(Boolean(restoredView.articleOpen && validPage==='newsroom'));
  const [selectedArticleId,setSelectedArticleId] = useState(restoredView.selectedArticleId || '');
  const [officialArticleRequest,setOfficialArticleRequest] = useState(0);
  const [statsTab,setStatsTab] = useState(restoredView.statsTab || 'player');
  const [toast,setToast] = useState('');
  const [playing,setPlaying] = useState(false);
  const [podcastTab,setPodcastTab] = useState(restoredView.podcastTab || 'episode');
  const [liveAuthOpen,setLiveAuthOpen] = useState(false);
  const [liveEmail,setLiveEmail] = useState('');
  const [livePassword,setLivePassword] = useState('');
  const [pageVisuals,setPageVisuals] = useState(()=>loadPageVisuals());
  const [visualEditorOpen,setVisualEditorOpen] = useState(false);
  const [visualTarget,setVisualTarget] = useState('home');
  const [visualBusy,setVisualBusy] = useState(false);
  const [profilePhotos,setProfilePhotos] = useState(()=>loadProfilePhotos());
  const [profileEditorOpen,setProfileEditorOpen] = useState(false);
  const [profileBusy,setProfileBusy] = useState(false);
  const [podcastArtwork,setPodcastArtwork] = useState(()=>loadPodcastArtwork());
  const [podcastArtBusy,setPodcastArtBusy] = useState('');
  const [shareOpen,setShareOpen] = useState(false);
  const [shareBusy,setShareBusy] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [searchQuery,setSearchQuery] = useState('');
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const [notificationState,setNotificationState] = useState(()=>loadNotificationState('guest'));
  const [shareUrl,setShareUrl] = useState('');
  const [shareEnabled,setShareEnabled] = useState(false);
  const [shareLastSynced,setShareLastSynced] = useState('');
  const [processingOpen,setProcessingOpen] = useState(false);
  const [processingIntent,setProcessingIntent] = useState('normal');
  const openSavedCoverageRegenerator=()=>{
    setProcessingIntent('regenerate');
    setProcessingOpen(true);
  };
  const openNormalWeekProcessor=()=>{
    setProcessingIntent('normal');
    setProcessingOpen(true);
  };
  const restoredSelectionRef=useRef(Boolean(restoredView.hasSelection || (hasRestoredSeason && hasRestoredWeek)));
  const pendingScrollRestoreRef=useRef(Number(restoredView.scrollY)||0);
  const scrollRestoredRef=useRef(false);
  const live = useReadOnlyLiveCareer();
  const notificationScope=live.user?.uid || 'guest';

  useEffect(()=>{
    setNotificationState(loadNotificationState(notificationScope));
  },[notificationScope]);

  const data = useMemo(
    () => live.career
      ? (derivePreviewData(live.career,{season,week}) || live.data || fallbackData)
      : fallbackData,
    [live.career,live.data,season,week],
  );
  const profilePhotoKey = useMemo(() => [
    live.user?.uid || 'sample-career',
    data.player?.name || 'player',
    data.player?.pos || 'position',
  ].map((value)=>String(value).trim().toLowerCase()).join('::'), [live.user?.uid,data.player?.name,data.player?.pos]);

  useEffect(()=>{
    if(!live.user?.uid || typeof window==='undefined') return;
    const enabled=window.localStorage.getItem('dynastyhq-redesign-follow-share-'+live.user.uid)==='1';
    setShareEnabled(enabled);
    if(enabled){
      const base=window.location.origin+window.location.pathname;
      setShareUrl(base+'?follow='+encodeURIComponent(live.user.uid));
    }
  },[live.user?.uid]);

  useEffect(()=>{
    if(!shareEnabled || !live.user?.uid || !live.data || !db || followerViewId) return undefined;
    const timer=window.setTimeout(async()=>{
      try{
        const publicRef=doc(db,'artifacts',productionAppId,'public','data','shared_dynasties',live.user.uid);
        await setDoc(publicRef,{redesignFollower:buildFollowerSnapshot(live.data)},{merge:true});
        setShareLastSynced(new Date().toISOString());
      }catch(error){
        console.warn('DynastyHQ follower share auto-sync failed',error);
      }
    },1200);
    return ()=>window.clearTimeout(timer);
  },[shareEnabled,live.user?.uid,live.data,followerViewId]);

  useEffect(() => {
    if (!live.data || restoredSelectionRef.current) return;
    setSeason(live.data.season);
    setWeek(live.data.week);
  }, [live.data?.season, live.data?.week]);

  useEffect(() => {
    if (!live.career) return;
    const seasonView=derivePreviewData(live.career,{season});
    const availableWeeks=seasonView?.navigation?.weeks || [];
    if (availableWeeks.length && !availableWeeks.includes(week)) setWeek(availableWeeks[0]);
  }, [season,live.career]);

  useEffect(()=>{
    if(!live.career || !selectedArticleId) return;
    if(!(data.news?.articles || []).some((article)=>article.id===selectedArticleId)){
      setSelectedArticleId('');
      setArticleOpen(false);
    }
  },[live.career,season,week,data.news?.publicationId,selectedArticleId]);

  useEffect(()=>{
    savePreviewViewState({
      page,
      season,
      week,
      hasSelection:true,
      articleOpen,
      selectedArticleId,
      statsTab,
      podcastTab,
      scrollY:typeof window!=='undefined' ? Math.round(window.scrollY) : 0,
    });
  },[page,season,week,articleOpen,selectedArticleId,statsTab,podcastTab]);

  useEffect(()=>{
    let frame=0;
    const rememberScroll=()=>{
      if(frame) return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        const current=loadPreviewViewState();
        savePreviewViewState({
          ...current,
          page,
          season,
          week,
          hasSelection:true,
          articleOpen,
          selectedArticleId,
          statsTab,
          podcastTab,
          scrollY:Math.round(window.scrollY),
        });
      });
    };
    window.addEventListener('scroll',rememberScroll,{passive:true});
    window.addEventListener('pagehide',rememberScroll);
    return ()=>{
      window.removeEventListener('scroll',rememberScroll);
      window.removeEventListener('pagehide',rememberScroll);
      if(frame) window.cancelAnimationFrame(frame);
    };
  },[page,season,week,articleOpen,selectedArticleId,statsTab,podcastTab]);

  useEffect(()=>{
    if(scrollRestoredRef.current) return;
    const target=pendingScrollRestoreRef.current;
    if(!target){
      scrollRestoredRef.current=true;
      return;
    }

    const timers=[60,220,650].map((delay,index)=>window.setTimeout(()=>{
      window.scrollTo({top:target,left:0,behavior:'auto'});
      if(index===2) scrollRestoredRef.current=true;
    },delay));

    return ()=>timers.forEach((timer)=>window.clearTimeout(timer));
  },[page,season,week,articleOpen,selectedArticleId,data.news?.publicationId,live.career]);

  const seasonOptions=data.navigation?.seasons?.length ? data.navigation.seasons : [season];
  const weekOptions=weekSelectorOptions(data.navigation?.weeks?.length ? data.navigation.weeks : [week]);
  const selectedWeekLabel=previewWeekLabelFor(live.career || data.state || {},season,week);
  const weekOptionLabel=(value)=>weekSelectorDisplayLabel(value,previewWeekLabelFor(live.career || data.state || {},season,value));

  const persistSelection = (nextSeason,nextWeek) => {
    const current=loadPreviewViewState();
    savePreviewViewState({
      ...current,
      page,
      season:Number(nextSeason),
      week:Number(nextWeek),
      hasSelection:true,
      articleOpen,
      selectedArticleId,
      statsTab,
      podcastTab,
      scrollY:Math.round(window.scrollY),
    });
    restoredSelectionRef.current=true;
  };

  const chooseSeason = (value) => {
    const nextSeason=Number(value);
    setSeason(nextSeason);
    persistSelection(nextSeason,week);
  };

  const chooseWeek = (value) => {
    const nextWeek=Number(value);
    setWeek(nextWeek);
    persistSelection(season,nextWeek);
  };

  const pageTitle = useMemo(()=>pages.find(p=>p[0]===page)?.[1] || 'Home',[page]);
  const go = (next) => { setPage(next); if(next!=='newsroom') setArticleOpen(false); setMobileMenu(false); setMobileMoreOpen(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openNewsArticle = (articleId='') => {
    setSelectedArticleId(articleId || data.news?.article?.id || '');
    setPage('newsroom');
    setArticleOpen(true);
    setMobileMenu(false);
    setMobileMoreOpen(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const openOfficialArticle = () => {
    setSelectedArticleId('');
    setArticleOpen(false);
    setPage('newsroom');
    setOfficialArticleRequest((value)=>value+1);
    setMobileMenu(false);
    setMobileMoreOpen(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const openPodcast = (tab='episode') => { setPodcastTab(tab); setPage('podcast'); setArticleOpen(false); setMobileMenu(false); setMobileMoreOpen(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openArchiveMoment = (targetSeason,targetWeek,target='gamehub',tab='episode') => {
    const nextSeason=Number(targetSeason);
    const nextWeek=Number(targetWeek);
    setSeason(nextSeason);
    setWeek(nextWeek);
    persistSelection(nextSeason,nextWeek);
    setMobileMenu(false);
    setMobileMoreOpen(false);
    setArticleOpen(target==='newsroom');
    if(target==='newsroom') setSelectedArticleId('');
    if (target==='podcast') setPodcastTab(tab);
    setPage(target);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const notify = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2200); };

  const currentCareerData=live.data || data;
  const searchItems=useMemo(()=>{
    const items=pages.map(([id,label])=>({
      id:'page-'+id,
      kind:'page',
      title:label,
      meta:id==='home'?'Current career dashboard':id==='gamehub'?'Weekly game data and preparation':id==='newsroom'?'Saved journalism and weekly editions':id==='podcast'?'The Huddle episodes, transcript and NotebookLM':id==='offseason'?'Season review and next chapter':id==='career'?'Player dossier, totals and milestones':'Career archive and signature moments',
      target:id,
    }));
    const entries=Array.isArray(data.chronicle?.entries)?data.chronicle.entries:[];
    entries.forEach((entry,index)=>{
      const entrySeason=Number(entry?.season)||1;
      const entryWeek=Number(entry?.week)||0;
      const baseId=String(entry?.id || entry?.publicationId || entrySeason+'-'+entryWeek+'-'+index);
      if(entry?.game){
        const totalYds=(Number(entry.game.passYds)||0)+(Number(entry.game.rushYds)||0);
        const totalTD=(Number(entry.game.passTD)||0)+(Number(entry.game.rushTD)||0);
        items.push({
          id:'game-'+baseId,
          kind:'game',
          title:'Week '+entryWeek+' vs '+String(entry.game.opponent || 'Opponent'),
          meta:'Season '+entrySeason+' · '+String(entry.game.result || 'Game')+' · '+totalYds+' total yards · '+totalTD+' total TD',
          season:entrySeason,week:entryWeek,target:'gamehub',
        });
      }
      if(entry?.media?.newsroom){
        items.push({
          id:'news-'+baseId,
          kind:'news',
          title:String(entry.media.newsroom.headline || 'Saved Newsroom edition'),
          meta:'Newsroom · Season '+entrySeason+' · Week '+entryWeek+(entry.media.newsroom.dek?' · '+entry.media.newsroom.dek:''),
          season:entrySeason,week:entryWeek,target:'newsroom',
        });
      }
      if(entry?.media?.podcast){
        items.push({
          id:'podcast-'+baseId,
          kind:'podcast',
          title:String(entry.media.podcast.title || 'The Huddle'),
          meta:'Podcast · Season '+entrySeason+' · Week '+entryWeek+(entry.media.podcast.finished?' · Audio ready':' · Transcript'),
          season:entrySeason,week:entryWeek,target:'podcast',tab:'episode',
        });
      }
      if(entry?.signature){
        items.push({
          id:'signature-'+baseId,
          kind:'chronicle',
          title:String(entry.signatureLabel || 'Signature career moment'),
          meta:'Chronicle · Season '+entrySeason+' · Week '+entryWeek+' · '+String(entry.signatureReasons?.join(' · ') || ''),
          season:entrySeason,week:entryWeek,target:'chronicle',
        });
      }
    });
    (data.career?.honors || []).forEach((honor,index)=>items.push({
      id:'honor-'+String(honor.id || index),
      kind:'honor',
      title:String(honor.name || honor.title || 'Career honor'),
      meta:'Career honor'+(honor.year || honor.season ? ' · '+String(honor.year || honor.season) : ''),
      target:'career',
    }));
    return items.slice(0,160);
  },[data.chronicle,data.career]);

  const searchResults=useMemo(()=>{
    const query=searchQuery.trim().toLowerCase();
    if(!query) return searchItems.slice(0,16);
    return searchItems
      .map((item)=>{
        const haystack=(item.title+' '+item.meta+' '+item.kind).toLowerCase();
        const title=item.title.toLowerCase();
        const score=title===query?0:title.startsWith(query)?1:title.includes(query)?2:haystack.includes(query)?3:99;
        return {item,score};
      })
      .filter(({score})=>score<99)
      .sort((a,b)=>a.score-b.score)
      .slice(0,24)
      .map(({item})=>item);
  },[searchItems,searchQuery]);

  const notificationCandidates=useMemo(()=>{
    const latest=currentCareerData || {};
    const items=[];
    if(live.status!=='connected'){
      items.push({id:'connect',kind:'account',title:'Connect your real DynastyHQ career',detail:'Search, alerts and archive actions become fully career-aware after sign-in.',action:'connect'});
      return items;
    }
    const seasonId=Number(latest.season)||0;
    const weekId=Number(latest.week)||0;
    const weekScope='s'+seasonId+'-w'+weekId;
    if(latest.selection?.isUpcoming){
      items.push({
        id:'upcoming-week:'+weekScope,
        kind:'week',
        title:'Week '+latest.week+' vs '+latest.game?.opponent+' is waiting',
        detail:'Play the matchup normally. After the final, Week Processing will capture the verified game packet.',
        season:latest.season,week:latest.week,target:'gamehub',
      });
    }
    if(latest.selection?.hasGame && !latest.selection?.hasNewsroom){
      items.push({
        id:'newsroom-missing:'+weekScope,
        kind:'news',
        title:'Newsroom coverage is not attached to the latest saved week',
        detail:'Open the saved week to review its coverage state.',
        season:latest.season,week:latest.week,target:'newsroom',
      });
    }
    if(latest.selection?.hasGame && latest.podcast?.segments?.length && !latest.podcast?.audioReady){
      items.push({
        id:'podcast-audio:'+weekScope,
        kind:'podcast',
        title:'The Huddle transcript is ready for final audio',
        detail:'Download the NotebookLM source pack or attach the finished master audio in Podcast Studio.',
        season:latest.season,week:latest.week,target:'podcast',tab:'episode',
      });
    }else if(latest.selection?.hasGame && !latest.podcast?.segments?.length){
      items.push({
        id:'podcast-missing:'+weekScope,
        kind:'podcast',
        title:'The latest saved week has no Podcast transcript',
        detail:'Open The Huddle to review the saved episode state.',
        season:latest.season,week:latest.week,target:'podcast',tab:'transcript',
      });
    }
    if(latest.offseason?.seasonComplete){
      items.push({
        id:'offseason-ready:s'+seasonId,
        kind:'offseason',
        title:'Season review is ready',
        detail:'The verified season is complete. Review the Off-Season workspace and career decision state.',
        target:'offseason',
      });
    }
    return items.slice(0,8);
  },[currentCareerData,live.status]);

  const notificationItems=useMemo(()=>notificationCandidates
    .filter((item)=>!notificationState.dismissedIds?.[item.id])
    .map((item)=>({...item,read:Boolean(notificationState.readIds?.[item.id])})),
  [notificationCandidates,notificationState]);

  const unreadNotificationCount=useMemo(
    ()=>notificationItems.filter((item)=>!item.read).length,
    [notificationItems],
  );

  const updateNotificationState=(updater)=>{
    setNotificationState((current)=>{
      const next={
        readIds:{...(current?.readIds || {})},
        dismissedIds:{...(current?.dismissedIds || {})},
      };
      updater(next);
      saveNotificationState(notificationScope,next);
      return next;
    });
  };

  const markNotificationRead=(id)=>{
    if(!id) return;
    updateNotificationState((next)=>{next.readIds[id]=true;});
  };

  const markAllNotificationsRead=()=>{
    if(!notificationItems.length) return;
    updateNotificationState((next)=>{
      notificationItems.forEach((item)=>{next.readIds[item.id]=true;});
    });
  };

  const deleteNotification=(id)=>{
    if(!id) return;
    updateNotificationState((next)=>{
      next.dismissedIds[id]=true;
      delete next.readIds[id];
    });
  };

  const clearAllNotifications=()=>{
    if(!notificationItems.length) return;
    updateNotificationState((next)=>{
      notificationItems.forEach((item)=>{
        next.dismissedIds[item.id]=true;
        delete next.readIds[item.id];
      });
    });
  };

  const openUtilityItem=(item)=>{
    setSearchOpen(false);
    setNotificationsOpen(false);
    setMobileMenu(false);
    setMobileMoreOpen(false);
    if(item?.action==='connect'){
      setLiveAuthOpen(true);
      return;
    }
    if(Number.isFinite(Number(item?.season)) && Number.isFinite(Number(item?.week))){
      openArchiveMoment(Number(item.season),Number(item.week),item.target || 'gamehub',item.tab || 'episode');
      return;
    }
    if(item?.target==='podcast') openPodcast(item.tab || 'episode');
    else go(item?.target || 'home');
  };

  const openNotificationItem=(item)=>{
    markNotificationRead(item?.id);
    openUtilityItem(item);
  };

  useEffect(()=>{
    const onKeyDown=(event)=>{
      if((event.metaKey || event.ctrlKey) && event.key.toLowerCase()==='k'){
        event.preventDefault();
        setNotificationsOpen(false);
        setSearchOpen(true);
      }
      if(event.key==='Escape'){
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[]);

  const publishFollowerShare=async()=>{
    if(!live.user?.uid || !live.data || !db){
      notify('Connect your real DynastyHQ career before creating a follower link.');
      return;
    }
    setShareBusy(true);
    try{
      const publicRef=doc(db,'artifacts',productionAppId,'public','data','shared_dynasties',live.user.uid);
      await setDoc(publicRef,{redesignFollower:buildFollowerSnapshot(live.data)},{merge:true});
      const base=window.location.origin+window.location.pathname;
      const url=base+'?follow='+encodeURIComponent(live.user.uid);
      setShareUrl(url);
      setShareEnabled(true);
      setShareLastSynced(new Date().toISOString());
      window.localStorage.setItem('dynastyhq-redesign-follow-share-'+live.user.uid,'1');
      notify('Read-only career follow link is ready.');
    }catch(error){
      notify(error?.message || 'DynastyHQ could not create the follower link.');
    }finally{
      setShareBusy(false);
    }
  };
  const copyFollowerShare=async()=>{
    if(!shareUrl) return;
    try{
      await navigator.clipboard.writeText(shareUrl);
      notify('Share link copied.');
    }catch{
      notify('Copy failed. Select the link manually.');
    }
  };
  const disableFollowerShare=async()=>{
    if(!live.user?.uid || !db) return;
    setShareBusy(true);
    try{
      const publicRef=doc(db,'artifacts',productionAppId,'public','data','shared_dynasties',live.user.uid);
      await setDoc(publicRef,{redesignFollower:null},{merge:true});
      setShareEnabled(false);
      setShareLastSynced('');
      window.localStorage.removeItem('dynastyhq-redesign-follow-share-'+live.user.uid);
      notify('Read-only career follow link disabled.');
    }catch(error){
      notify(error?.message || 'DynastyHQ could not disable the follower link.');
    }finally{
      setShareBusy(false);
    }
  };
  const visualFor = (id) => {
    const base=defaultPageVisual(id);
    const stored=pageVisuals[id] || {};
    const weeklyPhoto=data.news?.weeklyPhoto || null;
    const mode=stored.mode || (stored.image ? 'manual' : base.mode);
    const autoImage=weeklyPhoto?.url || base.image;
    const image=mode==='auto' ? autoImage : (stored.image || base.image);
    return {
      ...base,
      ...stored,
      mode,
      image,
      autoAvailable:Boolean(weeklyPhoto?.url),
      autoPhoto:weeklyPhoto,
      sourceLabel:mode==='auto'
        ? (weeklyPhoto?.url ? `Week ${data.week} · ${weeklyPhoto.fileName || 'Newsroom game photo'}` : `Week ${data.week} · default fallback`)
        : (stored.image ? 'Manual browser override' : 'Default player photo'),
    };
  };
  const persistVisuals = (next) => {
    setPageVisuals(next);
    try {
      window.localStorage.setItem(PAGE_VISUAL_STORAGE_KEY,JSON.stringify(next));
      return true;
    } catch {
      notify('That photo is too large for browser-only preview storage. Try a smaller image.');
      return false;
    }
  };
  const persistProfilePhotos = (next) => {
    setProfilePhotos(next);
    try {
      window.localStorage.setItem(PROFILE_PHOTO_STORAGE_KEY,JSON.stringify(next));
      return true;
    } catch {
      notify('That profile photo is too large for browser-only preview storage. Try a smaller image.');
      return false;
    }
  };
  const persistPodcastArtwork = (next) => {
    setPodcastArtwork(next);
    try {
      window.localStorage.setItem(PODCAST_ARTWORK_STORAGE_KEY,JSON.stringify(next));
      return true;
    } catch {
      notify('The cover art is too large for browser-only preview storage. Try a smaller image.');
      return false;
    }
  };
  const openVisualEditor = (id=page) => {
    setVisualTarget(id);
    setVisualEditorOpen(true);
    setMobileMenu(false);
  };
  const updateVisual = (id,patch) => {
    const stored=pageVisuals[id] || {};
    persistVisuals({...pageVisuals,[id]:{...stored,...patch,custom:true}});
  };
  const setVisualMode = (id,mode) => {
    const stored=pageVisuals[id] || {};
    persistVisuals({...pageVisuals,[id]:{...stored,mode,custom:true}});
  };
  const resetVisual = (id) => {
    const next={...pageVisuals};
    delete next[id];
    persistVisuals(next);
  };
  const uploadVisual = async (file) => {
    if(!file) return;
    setVisualBusy(true);
    try {
      const image=await compressPagePhoto(file);
      updateVisual(visualTarget,{image,mode:'manual'});
    } catch(error) {
      notify(error?.message || 'The photo could not be added.');
    } finally {
      setVisualBusy(false);
    }
  };
  const applyVisualToAll = () => {
    const current=visualFor(visualTarget);
    const storedCurrent=pageVisuals[visualTarget] || {};
    const next={...pageVisuals};
    pages.forEach(([id])=>{
      next[id]={
        ...(storedCurrent.image ? {image:storedCurrent.image} : {image:current.image}),
        position:current.position,
        mode:'manual',
        custom:true,
      };
    });
    persistVisuals(next);
    notify(storedCurrent.image ? 'That photo is now used across all page heroes in this browser.' : 'That photo focus is now used across all page heroes in this browser.');
  };
  const storedProfilePhoto=profilePhotos[profilePhotoKey] || {};
  const profileVisual={
    image:storedProfilePhoto.image || data.player?.headshot || visualFor('gamehub').image || playerPhoto,
    position:storedProfilePhoto.position || '50%',
    custom:Boolean(storedProfilePhoto.image),
  };
  const openProfilePhotoEditor = () => {
    setProfileEditorOpen(true);
    setMobileMenu(false);
    setMobileMoreOpen(false);
  };
  const updateProfilePhoto = (patch) => {
    const current=profilePhotos[profilePhotoKey] || {};
    persistProfilePhotos({...profilePhotos,[profilePhotoKey]:{...current,...patch}});
  };
  const uploadProfilePhoto = async (file) => {
    if(!file) return;
    setProfileBusy(true);
    try {
      const image=await compressPagePhoto(file);
      updateProfilePhoto({image});
      notify('Career profile photo updated across player identity cards in this preview.');
    } catch(error) {
      notify(error?.message || 'The profile photo could not be added.');
    } finally {
      setProfileBusy(false);
    }
  };
  const resetProfilePhoto = () => {
    const next={...profilePhotos};
    delete next[profilePhotoKey];
    persistProfilePhotos(next);
    notify('Career profile photo reset to the saved/default player image.');
  };

  const currentPodcastArtwork=podcastArtwork[profilePhotoKey] || {};
  const currentPodcastPublicationId=String(data.podcast?.publicationId || `season-${data.season}-week-${data.week}`);
  const showCoverImage=currentPodcastArtwork.show?.image || data.podcast?.showCoverUrl || podcastCover;
  const currentEpisodeArtwork=currentPodcastArtwork.episodes?.[currentPodcastPublicationId] || {};
  const currentEpisodeCoverImage=currentEpisodeArtwork.useShowCover
    ? showCoverImage
    : (currentEpisodeArtwork.image || data.podcast?.episodeCoverUrl || showCoverImage);
  const podcastCoverForPublication=(targetPublicationId,savedCoverUrl='')=>{
    const id=String(targetPublicationId || '');
    const local=currentPodcastArtwork.episodes?.[id] || {};
    if(local.useShowCover) return showCoverImage;
    return local.image || savedCoverUrl || showCoverImage;
  };
  const updatePodcastCareerArtwork = (updater) => {
    const current=podcastArtwork[profilePhotoKey] || {};
    const nextCareer=typeof updater==='function' ? updater(current) : updater;
    return persistPodcastArtwork({...podcastArtwork,[profilePhotoKey]:nextCareer});
  };
  const uploadPodcastShowCover = async (file) => {
    if(!file) return;
    setPodcastArtBusy('show');
    try {
      const image=await compressSquareArtwork(file);
      updatePodcastCareerArtwork((current)=>({
        ...current,
        show:{image,fileName:file.name || 'Podcast cover',updatedAt:new Date().toISOString()},
      }));
      notify('Default show cover updated in this redesign preview.');
    } catch(error) {
      notify(error?.message || 'The show cover could not be added.');
    } finally {
      setPodcastArtBusy('');
    }
  };
  const resetPodcastShowCover = () => {
    updatePodcastCareerArtwork((current)=>{
      const next={...current};
      delete next.show;
      return next;
    });
    notify('Default show cover reset to the saved DynastyHQ cover.');
  };
  const uploadPodcastEpisodeCover = async (file) => {
    if(!file) return;
    setPodcastArtBusy('episode');
    try {
      const image=await compressSquareArtwork(file);
      updatePodcastCareerArtwork((current)=>({
        ...current,
        episodes:{
          ...(current.episodes || {}),
          [currentPodcastPublicationId]:{
            image,
            fileName:file.name || `Season ${data.season} Week ${data.week} cover`,
            updatedAt:new Date().toISOString(),
          },
        },
      }));
      notify(`Season ${data.season}, Week ${data.week} episode cover updated in this preview.`);
    } catch(error) {
      notify(error?.message || 'The episode cover could not be added.');
    } finally {
      setPodcastArtBusy('');
    }
  };
  const useShowCoverForCurrentEpisode = () => {
    updatePodcastCareerArtwork((current)=>({
      ...current,
      episodes:{
        ...(current.episodes || {}),
        [currentPodcastPublicationId]:{
          useShowCover:true,
          updatedAt:new Date().toISOString(),
        },
      },
    }));
    notify(`Season ${data.season}, Week ${data.week} now uses the default show cover in this preview.`);
  };

  const connectLiveCareer = async (event) => {
    event.preventDefault();
    const ok = await live.signIn(liveEmail,livePassword);
    if (ok) {
      setLivePassword('');
      setLiveAuthOpen(false);
    }
  };

  if(followerViewId) return <FollowerView view={followerView}/>;

  return <div className="site-shell">
    <header className="site-header">
      <div className="top-row">
        <button className="brand" onClick={()=>go('home')}>DYNASTY<span>HQ</span></button>

        <nav className="desktop-nav" aria-label="Primary">
          {pages.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>{label}</button>)}

        </nav>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Search DynastyHQ" title="Search DynastyHQ · Ctrl/⌘ K" onClick={()=>{setNotificationsOpen(false);setSearchOpen(true)}}><Search size={19}/></button>
          <button
            className={'icon-btn notification-trigger '+(unreadNotificationCount?'has-unread':'')}
            aria-label={'Career notifications, '+unreadNotificationCount+' unread'}
            title={unreadNotificationCount ? unreadNotificationCount+' unread notification'+(unreadNotificationCount===1?'':'s') : 'No unread notifications'}
            onClick={()=>{setSearchOpen(false);setNotificationsOpen(v=>!v)}}
          ><Bell size={19}/>{unreadNotificationCount>0 && <span aria-hidden="true">{unreadNotificationCount>99?'99+':unreadNotificationCount}</span>}</button>
          <button className="icon-btn share-career-trigger" aria-label="Share career" title="Share read-only career follow link" onClick={()=>setShareOpen(true)}><Share2 size={18}/></button>
          <Logo team={data.player.school}/>
          <button className="menu-btn" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu">{mobileMenu?<X/>:<Menu/>}</button>
        </div>
      </div>

      <div className={'mobile-drawer '+(mobileMenu?'open':'')}>
        {pages.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={17}/>{label}</button>)}
        <button onClick={()=>{setMobileMenu(false);setNotificationsOpen(false);setSearchOpen(true)}}><Search size={17}/>Search</button>
        <button onClick={()=>{setMobileMenu(false);setSearchOpen(false);setNotificationsOpen(true)}}><Bell size={17}/>Notifications{unreadNotificationCount>0?' ('+unreadNotificationCount+' unread)':''}</button>
        <button onClick={()=>{setShareOpen(true);setMobileMenu(false)}}><Share2 size={17}/>Share career</button>
        <button className="mobile-visual-entry" onClick={()=>openVisualEditor(page)}><Camera size={17}/>Page photo</button>
      </div>

      <div className="career-row">
        <div className="career-copy"><b>ROAD TO GLORY</b><i/>{data.player.name} #{data.player.number}<i/>{data.player.school}</div>
        <div className="selectors">
          <label className="archive-select">SEASON
            <b>{season}</b>
            <select aria-label="Season" value={season} onChange={e=>chooseSeason(e.target.value)}>
              {seasonOptions.map(value=><option key={value} value={value}>{value}</option>)}
            </select><ChevronDown size={13}/>
          </label>
          <label className="archive-select">WEEK
            <b>{selectedWeekLabel}</b>
            <select aria-label="Week" value={week} onChange={e=>chooseWeek(e.target.value)}>
              {weekOptions.map(value=><option key={value} value={value}>{weekOptionLabel(value)}</option>)}
            </select><ChevronDown size={13}/>
          </label>
          <button className="dynasty-lock" onClick={()=>notify('Dynasty mode stays locked in this RTG preview.')}><LockKeyhole size={15}/>Dynasty</button>
        </div>
      </div>

      <div className="mobile-context-row" aria-label="Career archive controls">
        <label className="archive-select"><span>SEASON</span><b>{season}</b><select aria-label="Season" value={season} onChange={e=>chooseSeason(e.target.value)}>{seasonOptions.map(value=><option key={value} value={value}>{value}</option>)}</select><ChevronDown/></label>
        <label className="archive-select"><span>WEEK</span><b>{selectedWeekLabel}</b><select aria-label="Week" value={week} onChange={e=>chooseWeek(e.target.value)}>{weekOptions.map(value=><option key={value} value={value}>{weekOptionLabel(value)}</option>)}</select><ChevronDown/></label>
        <button onClick={()=>setMobileMoreOpen(true)}><Menu/><span>MORE</span></button>
      </div>

      <ScoreRibbon data={data}/>
    </header>

    <LiveDataBar
      live={live}
      open={liveAuthOpen}
      setOpen={setLiveAuthOpen}
      email={liveEmail}
      setEmail={setLiveEmail}
      password={livePassword}
      setPassword={setLivePassword}
      onConnect={connectLiveCareer}
    />

    <main className="preview-main">
      <button className="page-visual-trigger" onClick={()=>openVisualEditor(page)} aria-label={`Change ${pageTitle} hero photo`} title="Change page photo"><Camera/></button>
      {page==='home' && <HomePage data={data} visual={visualFor('home')} podcastEpisodeCover={currentEpisodeCoverImage} go={go} openArticle={openNewsArticle} openOfficialArticle={openOfficialArticle} openPodcast={openPodcast} openArchiveMoment={openArchiveMoment} notify={notify} schedulePanel={<ScheduleExperience career={live.career} user={live.user} data={data} mode="home" go={go} notify={notify} connectLive={()=>setLiveAuthOpen(true)}/>}/>} 
      {page==='gamehub' && <GameHub data={data} visual={visualFor('gamehub')} profileVisual={profileVisual} openProfilePhoto={openProfilePhotoEditor} go={go} openOfficialArticle={openOfficialArticle} openPodcast={openPodcast} openProcessing={openNormalWeekProcessor} onRegenerateCoverage={openSavedCoverageRegenerator} statsTab={statsTab} setStatsTab={setStatsTab} notify={notify} schedulePanel={<ScheduleExperience career={live.career} user={live.user} data={data} mode="full" go={go} notify={notify} connectLive={()=>setLiveAuthOpen(true)}/>}/>} 
      {page==='newsroom' && <Newsroom data={data} visual={visualFor('newsroom')} profileVisual={profileVisual} podcastEpisodeCover={currentEpisodeCoverImage} openProfilePhoto={openProfilePhotoEditor} onRegenerateCoverage={openSavedCoverageRegenerator} articleOpen={articleOpen} setArticleOpen={setArticleOpen} selectedArticleId={selectedArticleId} setSelectedArticleId={setSelectedArticleId} officialArticleRequest={officialArticleRequest} openArticle={openNewsArticle} openPodcast={openPodcast} openArchiveMoment={openArchiveMoment} go={go} playing={playing} setPlaying={setPlaying} notify={notify}/>} 
      {page==='podcast' && <PodcastPage data={data} visual={visualFor('podcast')} showCover={showCoverImage} episodeCover={currentEpisodeCoverImage} localPodcastArtwork={currentPodcastArtwork} podcastCoverForPublication={podcastCoverForPublication} podcastArtBusy={podcastArtBusy} onUploadShowCover={uploadPodcastShowCover} onResetShowCover={resetPodcastShowCover} onUploadEpisodeCover={uploadPodcastEpisodeCover} onUseShowCover={useShowCoverForCurrentEpisode} go={go} openArchiveMoment={openArchiveMoment} playing={playing} setPlaying={setPlaying} podcastTab={podcastTab} setPodcastTab={setPodcastTab} notify={notify} onRegenerateCoverage={openSavedCoverageRegenerator}/>} 
      {page==='offseason' && <OffseasonPage data={data} visual={visualFor('offseason')} go={go} openPodcast={openPodcast} openArticle={openNewsArticle} notify={notify}/>}
      {page==='career' && <CareerPage data={data} visual={visualFor('career')} profileVisual={profileVisual} openProfilePhoto={openProfilePhotoEditor} go={go} openArchiveMoment={openArchiveMoment}/>} 
      {page==='chronicle' && <ChroniclePage data={data} visual={visualFor('chronicle')} go={go} openPodcast={openPodcast} openArticle={openNewsArticle} openArchiveMoment={openArchiveMoment} notify={notify}/>} 
    </main>

    {mobileMoreOpen && <div className="mobile-more-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setMobileMoreOpen(false)}}>
      <section className="mobile-more-sheet" aria-label="More DynastyHQ destinations">
        <header><div><span>DYNASTYHQ</span><b>More</b></div><button onClick={()=>setMobileMoreOpen(false)} aria-label="Close"><X/></button></header>
        <div className="mobile-more-grid">
          <button onClick={()=>go('offseason')}><Target/><span><b>Off-Season</b><small>Review, decisions and next chapter</small></span></button>
          <button onClick={()=>go('career')}><UserRound/><span><b>Career</b><small>Player dossier and career progress</small></span></button>
          <button onClick={()=>go('chronicle')}><BookOpen/><span><b>Chronicle</b><small>Full career archive and museum</small></span></button>
          <button onClick={()=>openVisualEditor(page)}><Camera/><span><b>Page photo</b><small>Customize this page’s visual</small></span></button>
          <button onClick={()=>{setMobileMoreOpen(false);setNotificationsOpen(false);setSearchOpen(true)}}><Search/><span><b>Search</b><small>Find games, stories, episodes and milestones</small></span></button>
          <button onClick={()=>{setMobileMoreOpen(false);setSearchOpen(false);setNotificationsOpen(true)}}><Bell/><span><b>Notifications{unreadNotificationCount?' · '+unreadNotificationCount+' unread':''}</b><small>{unreadNotificationCount?'Current career attention items':'No unread career alerts'}</small></span></button>
        </div>
        <div className="mobile-more-status"><LockKeyhole/><span><b>Dynasty mode</b><small>Locked during this Road to Glory career</small></span></div>
      </section>
    </div>}

    <nav className="mobile-bottom">
      <button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>Home</span></button>
      <button className={page==='gamehub'?'active':''} onClick={()=>go('gamehub')}><CalendarDays/><span>Week</span></button>
      <button className={page==='newsroom'?'active':''} onClick={()=>go('newsroom')}><Newspaper/><span>News</span></button>
      <button className={page==='podcast'?'active':''} onClick={()=>openPodcast('episode')}><Headphones/><span>Podcast</span></button>
      <button className={['offseason','career','chronicle'].includes(page)||mobileMoreOpen?'active':''} onClick={()=>setMobileMoreOpen(v=>!v)}><Menu/><span>More</span></button>
    </nav>

    <GlobalSearchModal
      open={searchOpen}
      query={searchQuery}
      setQuery={setSearchQuery}
      results={searchResults}
      onClose={()=>{setSearchOpen(false);setSearchQuery('')}}
      onOpen={openUtilityItem}
    />

    <NotificationPanel
      open={notificationsOpen}
      items={notificationItems}
      unreadCount={unreadNotificationCount}
      onClose={()=>setNotificationsOpen(false)}
      onOpen={openNotificationItem}
      onDelete={deleteNotification}
      onMarkAllRead={markAllNotificationsRead}
      onClearAll={clearAllNotifications}
    />

    <WeekProcessingCenter
      open={processingOpen}
      intent={processingIntent}
      data={data}
      user={live.user}
      onClose={()=>setProcessingOpen(false)}
      notify={notify}
    />

    <PageVisualEditor
      open={visualEditorOpen}
      target={visualTarget}
      setTarget={setVisualTarget}
      visual={visualFor(visualTarget)}
      busy={visualBusy}
      onClose={()=>setVisualEditorOpen(false)}
      onUpload={uploadVisual}
      onReset={()=>resetVisual(visualTarget)}
      onMode={(mode)=>setVisualMode(visualTarget,mode)}
      onPosition={(position)=>updateVisual(visualTarget,{position})}
      onApplyAll={applyVisualToAll}
    />

    <ProfilePhotoEditor
      open={profileEditorOpen}
      name={data.player.name}
      visual={profileVisual}
      busy={profileBusy}
      onClose={()=>setProfileEditorOpen(false)}
      onUpload={uploadProfilePhoto}
      onReset={resetProfilePhoto}
      onPosition={(position)=>updateProfilePhoto({position})}
    />

    <ShareCareerModal
      open={shareOpen}
      busy={shareBusy}
      url={shareUrl}
      enabled={shareEnabled}
      lastSynced={shareLastSynced}
      onClose={()=>setShareOpen(false)}
      onPublish={publishFollowerShare}
      onCopy={copyFollowerShare}
      onDisable={disableFollowerShare}
    />

    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function GlobalSearchModal({open,query,setQuery,results,onClose,onOpen}){
  if(!open) return null;
  const iconFor=(kind)=>{
    if(kind==='game') return <BarChart3/>;
    if(kind==='news') return <Newspaper/>;
    if(kind==='podcast') return <Headphones/>;
    if(kind==='chronicle') return <BookOpen/>;
    if(kind==='honor') return <Trophy/>;
    return <Search/>;
  };
  return <div className="global-search-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="global-search-modal" role="dialog" aria-modal="true" aria-label="Search DynastyHQ">
      <header>
        <Search/>
        <input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search games, articles, podcasts, milestones…" aria-label="Search DynastyHQ"/>
        <button onClick={onClose} aria-label="Close search"><X/></button>
      </header>
      <div className="global-search-hint"><span>{query.trim()?'SEARCH RESULTS':'QUICK DESTINATIONS + RECENT CAREER HISTORY'}</span><small>Ctrl/⌘ K opens search anywhere</small></div>
      <div className="global-search-results">
        {results.length ? results.map((item)=><button key={item.id} onClick={()=>onOpen(item)}>
          <i>{iconFor(item.kind)}</i>
          <span><b>{item.title}</b><small>{item.meta}</small></span>
          <ChevronRight/>
        </button>) : <div className="global-search-empty"><Search/><b>No DynastyHQ matches</b><span>Try an opponent, week, article headline, podcast title, or page name.</span></div>}
      </div>
    </section>
  </div>;
}

function NotificationPanel({open,items,unreadCount,onClose,onOpen,onDelete,onMarkAllRead,onClearAll}){
  if(!open) return null;
  const iconFor=(kind)=>{
    if(kind==='week') return <CalendarDays/>;
    if(kind==='news') return <Newspaper/>;
    if(kind==='podcast') return <Headphones/>;
    if(kind==='offseason') return <Target/>;
    if(kind==='account') return <ShieldCheck/>;
    return <Bell/>;
  };
  const statusLabel=items.length
    ? (unreadCount ? unreadCount+' unread · '+items.length+' total' : 'All read · '+items.length+' total')
    : 'All caught up';
  return <div className="notification-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="notification-panel" role="dialog" aria-modal="true" aria-label="Career notifications">
      <header><div><span>DYNASTYHQ</span><h2>Career alerts</h2></div><button onClick={onClose} aria-label="Close notifications"><X/></button></header>
      <div className="notification-toolbar">
        <span>{statusLabel}</span>
        <div>
          <button onClick={onMarkAllRead} disabled={!unreadCount} title="Mark every visible notification as read"><Check/>MARK ALL READ</button>
          <button onClick={onClearAll} disabled={!items.length} title="Delete every visible notification"><Trash2/>CLEAR ALL</button>
        </div>
      </div>
      <p>Live career attention items. Reading or deleting alerts is remembered on this device. Deleting an alert only clears the notification—it does not change your career data.</p>
      <div className="notification-list">
        {items.length ? items.map((item)=><div key={item.id} className={'notification-item '+(item.read?'is-read':'is-unread')}>
          <button className="notification-open" onClick={()=>onOpen(item)}>
            <i>{iconFor(item.kind)}</i>
            <span><b>{item.title}<em>{item.read?'READ':'NEW'}</em></b><small>{item.detail}</small></span>
            <ChevronRight/>
          </button>
          <button className="notification-delete" onClick={()=>onDelete(item.id)} aria-label={'Delete notification: '+item.title} title="Delete notification"><Trash2/></button>
        </div>) : <div className="notification-empty"><Check/><span><b>All caught up.</b><small>No unread or saved career alerts.</small></span></div>}
      </div>
    </section>
  </div>;
}

function ShareCareerModal({open,busy,url,enabled,lastSynced,onClose,onPublish,onCopy,onDisable}){
  if(!open) return null;
  const syncedLabel=lastSynced
    ? new Date(lastSynced).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
    : '';
  return <div className="share-modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget) onClose()}}>
    <section className="share-career-modal" role="dialog" aria-modal="true" aria-label="Share career">
      <header>
        <div><span><Share2/>CAREER FOLLOW</span><h2>Share a read-only career page</h2></div>
        <button onClick={onClose} aria-label="Close share career"><X/></button>
      </header>
      <p>Friends get a clean follower view with the current result, career totals, latest Newsroom story, podcast status, honors and recent milestones. No owner controls or private editing data are exposed.</p>

      {url ? <div className="share-link-box">
        <Link2/>
        <input readOnly value={url} aria-label="Read-only career share link"/>
        <button onClick={onCopy}><Copy/>COPY</button>
      </div> : <div className="share-link-empty"><ShieldCheck/><span><b>No public follower link yet.</b><small>Create it once and the same link can stay with the career.</small></span></div>}

      <div className="share-career-actions">
        <button className="share-primary" disabled={busy} onClick={onPublish}><Share2/>{busy?'WORKING…':enabled?'UPDATE SHARE NOW':url?'ENABLE SHARE LINK':'CREATE SHARE LINK'}</button>
        {url && <button className="share-secondary" onClick={()=>window.open(url,'_blank','noopener,noreferrer')}>OPEN FOLLOWER VIEW<ChevronRight/></button>}
        {enabled && <button className="share-disable" disabled={busy} onClick={onDisable}><LockKeyhole/>DISABLE FOLLOW LINK</button>}
      </div>

      <div className="share-sync-note"><ShieldCheck/><span><b>{enabled?'AUTO-SYNC ON':'READ-ONLY BY DESIGN'}</b><small>{enabled?'When your connected career changes while DynastyHQ is open, the lightweight follower snapshot refreshes automatically.':'Creating the link publishes only a compact follower snapshot, not your editable master save.'}{syncedLabel ? ' · Last synced '+syncedLabel : ''}</small></span></div>
    </section>
  </div>;
}

function FollowerView({view}){
  if(view.status==='loading') return <div className="follower-loading"><ShieldCheck/><b>Loading DynastyHQ career…</b></div>;
  if(view.status!=='ready' || !view.snapshot) return <div className="follower-loading follower-missing"><Shield/><b>This career follow page is not available.</b><span>The owner may not have published it yet, or the link may have been revoked.</span></div>;

  const s=view.snapshot;
  const player=s.player || {};
  const game=s.game || {};
  const totals=s.totals || {};
  const career=s.career || {};
  const honors=career.honors || [];
  const timeline=career.timeline || [];
  const updated=s.updatedAt ? new Date(s.updatedAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Recently';

  return <div className="follower-shell">
    <header className="follower-header">
      <div className="follower-brand">DYNASTY<span>HQ</span></div>
      <div className="follower-readonly"><ShieldCheck/>READ-ONLY CAREER FOLLOW</div>
    </header>

    <main className="follower-main">
      <section className="follower-hero">
        <div>
          <span>SEASON {s.season} · WEEK {s.week}</span>
          <h1>{player.name}</h1>
          <p>#{player.number} · {player.pos} · {player.school}{player.overall!=='' ? ' · '+player.overall+' OVR' : ''}</p>
          <small>Updated {updated}</small>
        </div>
        <Logo team={player.school}/>
      </section>

      <section className="follower-latest">
        <div className="follower-score">
          <span>LATEST RESULT</span>
          <div><Logo team={player.school}/><strong>{game.us}</strong><em>FINAL</em><strong>{game.them}</strong><span>{game.opponent}</span></div>
          <p>Week {game.week} · {game.result || 'Final'} · {game.total} total yards · {game.td} total TD</p>
        </div>
        <div className="follower-game-stats">
          <article><strong>{game.pass}</strong><span>PASS YDS</span><small>{game.passTD} TD</small></article>
          <article><strong>{game.rush}</strong><span>RUSH YDS</span><small>{game.rushTD} TD</small></article>
          <article><strong>{game.td}</strong><span>TOTAL TD</span><small>{game.interceptions} INT</small></article>
        </div>
      </section>

      <section className="follower-stat-grid">
        <article><span>CAREER PASSING</span><strong>{Number(totals.passYds||0).toLocaleString()}</strong><small>{totals.passTD||0} TD</small></article>
        <article><span>CAREER RUSHING</span><strong>{Number(totals.rushYds||0).toLocaleString()}</strong><small>{totals.rushTD||0} TD</small></article>
        <article><span>COLLEGE RECORD</span><strong>{career.record?.wins||0}–{career.record?.losses||0}</strong><small>{career.appearances||totals.appearances||0} appearances</small></article>
        <article><span>CURRENT CHAPTER</span><strong>{career.stage || 'Road to Glory'}</strong><small>{s.next?.opponent ? 'Next: Week '+s.next.week+' vs '+s.next.opponent : 'Season in progress'}</small></article>
      </section>

      <section className="follower-content-grid">
        <article className="follower-story">
          <span><Newspaper/>LATEST FROM THE NEWSROOM</span>
          {s.news?.photoUrl && <img src={s.news.photoUrl} alt="Latest career coverage"/>}
          <h2>{s.news?.headline || 'Career coverage will appear here.'}</h2>
          <p>{s.news?.dek || 'The owner has not published a Newsroom summary in the follower snapshot yet.'}</p>
          {s.news?.outlet && <small>{s.news.outlet}</small>}
        </article>

        <article className="follower-podcast">
          <span><Headphones/>THE HUDDLE</span>
          <h2>{s.podcast?.title || 'Podcast update pending'}</h2>
          <p>{s.podcast?.summary || 'Podcast notes will appear here when an episode is available.'}</p>
          <div><b>{s.podcast?.duration || '—'}</b><em>{s.podcast?.audioReady?'AUDIO READY':'TRANSCRIPT / NOTES'}</em></div>
        </article>
      </section>

      <section className="follower-history-grid">
        <article>
          <header><span>ACHIEVEMENTS</span><h2>Honors & Milestones</h2></header>
          <div className="follower-honors">
            {honors.length ? honors.map((honor)=><div key={honor.id}><Trophy/><span><b>{honor.name}</b><small>{honor.year}</small></span></div>) : <p>No honors have been published yet.</p>}
          </div>
        </article>

        <article>
          <header><span>CAREER STORY</span><h2>Recent milestones</h2></header>
          <div className="follower-timeline">
            {timeline.length ? timeline.map((entry)=><div key={entry.id}><i/><span><small>S{entry.season} · W{entry.week}</small><b>{entry.title}</b><p>{entry.summary}</p></span></div>) : <p>Career milestones will collect here as the story grows.</p>}
          </div>
        </article>
      </section>

      <footer className="follower-footer"><ShieldCheck/><span>This page is a read-only DynastyHQ career follow snapshot. Editing controls and private owner data are never included.</span></footer>
    </main>
  </div>;
}

function WeekProcessingCenter({open,data,user,onClose,notify,intent='normal'}){
  const inputRef=useRef(null);
  const rtgInputRef=useRef(null);
  const coverageInputRef=useRef(null);
  const officialInputRef=useRef(null);
  const gamePhotoInputRef=useRef(null);
  const [phase,setPhase]=useState('game');
  const [files,setFiles]=useState([]);
  const [dragging,setDragging]=useState(false);

  const [scanning,setScanning]=useState(false);
  const [scanProgress,setScanProgress]=useState(0);
  const [scanStatus,setScanStatus]=useState('');
  const [scanError,setScanError]=useState('');
  const [scanDraft,setScanDraft]=useState(null);
  const [reviewRows,setReviewRows]=useState([]);
  const [officialArticles,setOfficialArticles]=useState([]);
  const [officialScanning,setOfficialScanning]=useState(false);
  const [officialProgress,setOfficialProgress]=useState('');
  const [officialError,setOfficialError]=useState('');

  const [rtgScanning,setRtgScanning]=useState(false);
  const [rtgProgress,setRtgProgress]=useState('');
  const [rtgFacts,setRtgFacts]=useState([]);
  const [rtgScreens,setRtgScreens]=useState([]);
  const [rtgError,setRtgError]=useState('');
  const [rtgSkipped,setRtgSkipped]=useState(false);

  const [coverageScanning,setCoverageScanning]=useState(false);
  const [coverageProgress,setCoverageProgress]=useState('');
  const [coverageFacts,setCoverageFacts]=useState([]);
  const [coverageScreens,setCoverageScreens]=useState([]);
  const [coverageError,setCoverageError]=useState('');
  const [coverageSkipped,setCoverageSkipped]=useState(false);

  const [gamePhotos,setGamePhotos]=useState([]);
  const [gamePhotoError,setGamePhotoError]=useState('');
  const [gamePhotoUploading,setGamePhotoUploading]=useState(false);
  const [gamePhotoProgress,setGamePhotoProgress]=useState('');
  const [gamePhotosSkipped,setGamePhotosSkipped]=useState(false);

  const [publishConfirm,setPublishConfirm]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [publishError,setPublishError]=useState('');
  const [publishResult,setPublishResult]=useState(null);
  const [coverageRefreshBusy,setCoverageRefreshBusy]=useState(false);
  const [coverageRefreshError,setCoverageRefreshError]=useState('');
  const [coverageRefreshResult,setCoverageRefreshResult]=useState(null);
  const [regenerateConfirm,setRegenerateConfirm]=useState(false);
  const [regenerateTarget,setRegenerateTarget]=useState('both');

  const game=data.game || {};
  const weekDisplayLabel=data.weekLabel || `W${game.week}`;
  const team=game.team || {};
  const career=data.state || {};
  const hasSavedGame=Boolean(data.selection?.hasGame);
  const publicationId=`season-${Number(data.season)||1}-week-${Number(data.week)||0}`;
  const currentOfficialSaved=(career.eaSportsNetworkArticles || []).some((entry)=>(
    entry?.publicationId===publicationId
    || (Number(entry?.season||1)===Number(data.season) && Number(entry?.week)===Number(data.week))
  ));

  const steps=[
    ['game','Game Data',Upload],
    ['review','Review',ShieldCheck],
    ['rtg','RTG Status',Sparkles],
    ['coverage','Coverage',Newspaper],
    ['photos','Game Photos',Camera],
    ['ready','Process Week',Zap],
  ];
  const phaseIndex=Math.max(0,steps.findIndex(([id])=>id===phase));

  const revokeFiles=(items)=>items.forEach((entry)=>entry?.url && URL.revokeObjectURL(entry.url));

  useEffect(()=>{
    if(!open) return;
    setPhase(intent==='regenerate' && data.selection?.hasGame ? 'regenerate' : 'game');
    setRegenerateConfirm(false);
    setRegenerateTarget('both');
    revokeFiles(files);
    setFiles([]);
    setDragging(false);
    setScanning(false);
    setScanProgress(0);
    setScanStatus('');
    setScanError('');
    setScanDraft(null);
    setReviewRows([]);
    setOfficialArticles([]);
    setOfficialScanning(false);
    setOfficialProgress('');
    setOfficialError('');
    setRtgScanning(false);
    setRtgProgress('');
    setRtgFacts([]);
    setRtgScreens([]);
    setRtgError('');
    setRtgSkipped(false);
    setCoverageScanning(false);
    setCoverageProgress('');
    setCoverageFacts([]);
    setCoverageScreens([]);
    setCoverageError('');
    setCoverageSkipped(false);
    revokeFiles(gamePhotos);
    setGamePhotos([]);
    setGamePhotoError('');
    setGamePhotoUploading(false);
    setGamePhotoProgress('');
    setGamePhotosSkipped(false);
    setPublishConfirm(false);
    setPublishing(false);
    setPublishError('');
    setPublishResult(null);
    setCoverageRefreshBusy(false);
    setCoverageRefreshError('');
    setCoverageRefreshResult(null);
  },[open,data.season,data.week,intent]);

  useEffect(()=>()=>revokeFiles(files),[]);

  if(!open) return null;

  const addFiles=(fileList)=>{
    const incoming=[...(fileList||[])].filter((file)=>file?.type?.startsWith('image/')).slice(0,30);
    if(!incoming.length) return;
    const mapped=incoming.map((file,index)=>({
      id:`${file.name}-${file.size}-${file.lastModified}-${index}`,
      name:file.name,
      size:file.size,
      url:URL.createObjectURL(file),
      label:'Game screenshot',
      virtual:false,
      file,
    }));
    setScanError('');
    setFiles((current)=>{
      const keyed=new Map(current.map((entry)=>[`${entry.name}:${entry.size}:${entry.file?.lastModified||entry.id}`,entry]));
      mapped.forEach((entry)=>keyed.set(`${entry.name}:${entry.size}:${entry.file?.lastModified||entry.id}`,entry));
      return [...keyed.values()].slice(0,30);
    });
  };

  const removeFile=(id)=>{
    setFiles((current)=>{
      const target=current.find((entry)=>entry.id===id);
      if(target?.url) URL.revokeObjectURL(target.url);
      return current.filter((entry)=>entry.id!==id);
    });
  };

  const addGamePhotos=(fileList)=>{
    const selected=[...(fileList||[])].filter((file)=>file?.type?.match(/^image\/(png|jpe?g|webp)$/i)).slice(0,12);
    if(!selected.length){
      setGamePhotoError('Choose PNG, JPEG, or WebP game photos.');
      return;
    }
    const mapped=selected.map((file,index)=>({
      id:`game-photo-${file.name}-${file.size}-${file.lastModified}-${index}`,
      name:file.name,
      size:file.size,
      url:URL.createObjectURL(file),
      file,
    }));
    setGamePhotoError('');
    setGamePhotosSkipped(false);
    setGamePhotos((current)=>{
      const keyed=new Map(current.map((entry)=>[`${entry.name}:${entry.size}:${entry.file?.lastModified||entry.id}`,entry]));
      mapped.forEach((entry)=>keyed.set(`${entry.name}:${entry.size}:${entry.file?.lastModified||entry.id}`,entry));
      return [...keyed.values()].slice(0,12);
    });
  };

  const removeGamePhoto=(id)=>{
    setGamePhotos((current)=>{
      const target=current.find((entry)=>entry.id===id);
      if(target?.url) URL.revokeObjectURL(target.url);
      return current.filter((entry)=>entry.id!==id);
    });
  };

  const uploadGamePhotoAssets=async({signedInUser,targetPublicationId,targetSeason,targetWeek})=>{
    if(!gamePhotos.length) return [];
    const assets=[];
    setGamePhotoUploading(true);
    setGamePhotoError('');
    try{
      for(let index=0;index<gamePhotos.length;index+=1){
        const entry=gamePhotos[index];
        setGamePhotoProgress(`Uploading game photo ${index+1} of ${gamePhotos.length}: ${entry.name}`);
        const assetId=globalThis.crypto?.randomUUID?.() || `week-game-photo-${targetSeason}-${targetWeek}-${Date.now()}-${index}`;
        const imageDataUrl=await compressImage(entry.file,2400,0.88);
        const uploaded=await uploadNewsroomMedia({
          firebaseApp,
          appId:productionAppId,
          userId:signedInUser.uid,
          assetId,
          imageDataUrl,
          fileName:entry.name,
          origin:NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        });
        assets.push(createNewsroomMediaAsset({
          id:assetId,
          ...uploaded,
          fileName:entry.name,
          origin:NEWSROOM_MEDIA_ORIGINS.UPLOAD,
          referenceLabel:`Season ${targetSeason} Week ${targetWeek} vs ${data.game?.opponent || 'opponent'} game photo`,
          careerFolder:String(career.careerPhase || '').toLowerCase().includes('coach')
            ? 'coaching'
            : (String(data.game?.stage || '').toLowerCase().includes('high-school') ? 'high-school' : 'college'),
          allowAutoAssign:true,
          teamTag:data.player?.school || '',
          weekPublicationId:targetPublicationId,
          weekSeason:targetSeason,
          week:targetWeek,
          opponent:data.game?.opponent || '',
        }));
      }
      return assets;
    }catch(error){
      await Promise.allSettled(assets.map((asset)=>deleteNewsroomMedia({firebaseApp,storagePath:asset.storagePath})));
      throw error;
    }finally{
      setGamePhotoUploading(false);
      setGamePhotoProgress('');
    }
  };

  const uploadOfficialArticleScreenshots=async({signedInUser,targetPublicationId,targetSeason,targetWeek})=>{
    if(!officialArticles.length) return {articles:[],uploaded:[]};
    const uploaded=[];
    const prepared=[];
    try{
      for(let articleIndex=0;articleIndex<officialArticles.length;articleIndex+=1){
        const article=officialArticles[articleIndex] || {};
        const sourcePages=Array.isArray(article.sourcePages) && article.sourcePages.length
          ? article.sourcePages
          : [{
            pageNumber:1,
            fileName:article.fileName || article.sourceFileName || '',
            body:article.body || '',
            imageDataUrl:article.imageDataUrl || '',
            screenshotUrl:article.screenshotUrl || '',
            screenshotStoragePath:article.screenshotStoragePath || '',
            screenshotMimeType:article.screenshotMimeType || '',
            screenshotSizeBytes:Number(article.screenshotSizeBytes)||0,
          }];
        const savedPages=[];

        for(let pageIndex=0;pageIndex<sourcePages.length;pageIndex+=1){
          const page=sourcePages[pageIndex] || {};
          const {imageDataUrl:pageImageDataUrl,...pageWithoutImageData}=page;
          if(pageImageDataUrl){
            setOfficialProgress(`Preserving EA SPORTS Network page ${pageIndex+1} of ${sourcePages.length}…`);
            const assetId=globalThis.crypto?.randomUUID?.() || `ea-network-${targetSeason}-${targetWeek}-${Date.now()}-${articleIndex}-${pageIndex}`;
            const saved=await uploadNewsroomMedia({
              firebaseApp,
              appId:productionAppId,
              userId:signedInUser.uid,
              assetId,
              imageDataUrl:pageImageDataUrl,
              fileName:page.fileName || `EA-Sports-Network-S${targetSeason}-W${targetWeek}-P${pageIndex+1}.jpg`,
              origin:'ea-sports-network',
            });
            uploaded.push(saved);
            savedPages.push({
              ...pageWithoutImageData,
              pageNumber:pageIndex+1,
              screenshotUrl:saved.downloadUrl,
              screenshotStoragePath:saved.storagePath,
              screenshotMimeType:saved.mimeType,
              screenshotSizeBytes:saved.sizeBytes,
            });
          }else{
            savedPages.push({...pageWithoutImageData,pageNumber:pageIndex+1});
          }
        }

        let stitchedSaved=null;
        if(article.stitchedImageDataUrl){
          setOfficialProgress('Saving the seamless EA SPORTS Network article…');
          const stitchedAssetId=globalThis.crypto?.randomUUID?.() || `ea-network-stitched-${targetSeason}-${targetWeek}-${Date.now()}-${articleIndex}`;
          stitchedSaved=await uploadNewsroomMedia({
            firebaseApp,
            appId:productionAppId,
            userId:signedInUser.uid,
            assetId:stitchedAssetId,
            imageDataUrl:article.stitchedImageDataUrl,
            fileName:`EA-Sports-Network-S${targetSeason}-W${targetWeek}-STITCHED.jpg`,
            origin:'ea-sports-network-stitched',
          });
          uploaded.push(stitchedSaved);
        }

        const merged=mergeOfficialCoveragePages([{
          ...article,
          sourcePages:savedPages,
        }]) || article;
        const firstImage=savedPages.find((page)=>page.screenshotUrl) || {};
        prepared.push({
          ...merged,
          pageCount:savedPages.length,
          sourcePages:savedPages,
          screenshotUrl:firstImage.screenshotUrl || merged.screenshotUrl || '',
          screenshotStoragePath:firstImage.screenshotStoragePath || merged.screenshotStoragePath || '',
          screenshotMimeType:firstImage.screenshotMimeType || merged.screenshotMimeType || '',
          screenshotSizeBytes:Number(firstImage.screenshotSizeBytes || merged.screenshotSizeBytes)||0,
          stitchedScreenshotUrl:stitchedSaved?.downloadUrl || article.stitchedScreenshotUrl || '',
          stitchedStoragePath:stitchedSaved?.storagePath || article.stitchedStoragePath || '',
          stitchedMimeType:stitchedSaved?.mimeType || article.stitchedMimeType || '',
          stitchedSizeBytes:Number(stitchedSaved?.sizeBytes || article.stitchedSizeBytes)||0,
          stitchMeta:article.stitchMeta || null,
        });
      }
      return {articles:prepared,uploaded};
    }catch(error){
      await Promise.allSettled(uploaded.map((entry)=>deleteNewsroomMedia({firebaseApp,storagePath:entry.storagePath})));
      throw error;
    }finally{
      setOfficialProgress('');
    }
  };

  const loadSavedDemo=()=>{
    const demo=[
      ['final-score','Final score'],
      ['player-stats','Player stats'],
      ['team-stats','Team stats'],
      ['scoring-summary','Scoring summary'],
    ].map(([id,label])=>({id:`demo-${id}`,name:`${label}.png`,size:0,url:'',label,virtual:true,file:null}));
    const rows=[
      ['game.result','Result',game.result],
      ['game.homeScore','Team score',game.us],
      ['game.awayScore','Opponent score',game.them],
      ['game.passYds','Player passing yards',game.pass],
      ['game.passTD','Player passing TDs',game.passTD],
      ['game.rushYds','Player rushing yards',game.rush],
      ['game.rushTD','Player rushing TDs',game.rushTD],
      ['game.int','Player interceptions',game.interceptions],
      ['game.teamTotalYards','Team total offense',team.totalYards],
      ['game.teamFirstDowns','Team first downs',team.firstDowns],
      ['game.teamTurnovers','Team turnovers',team.turnovers],
    ].filter(([, ,value])=>value!==null && value!==undefined && value!=='').map(([key,label,value],index)=>({
      id:`demo-${index}`,key,label,value,confidence:1,evidence:'Existing saved week value',selected:true,sourceId:'saved-week-demo'
    }));
    setFiles(demo);
    setScanDraft({facts:rows,sources:[{id:'saved-week-demo',fileName:'Saved week'}],gamePatch:game.raw || {}});
    setReviewRows(rows);
    setScanError('');
    notify('Loaded the selected saved week into a local review demo. No scanner call or career write occurred.');
  };

  const scanGameData=async()=>{
    if(!files.length || scanning) return;
    const actual=files.filter((entry)=>entry.file);
    if(!actual.length){
      if(hasSavedGame){
        setPhase('review');
        return;
      }
      setScanError('Choose real screenshots before running the scanner.');
      return;
    }
    if(!user){
      setScanError('Connect your DynastyHQ account before using the real scanner.');
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setScanStatus('Preparing scanner…');
    setScanError('');
    setReviewRows([]);
    try{
      const idToken=await user.getIdToken();
      let draft=createEmptyScanDraft({
        season:data.season,
        week:data.week,
        careerPhase:career.careerPhase || 'Player',
        isCommitted:Boolean(career.player?.isCommitted),
      });
      let officialDetected=0;

      for(let index=0;index<actual.length;index+=1){
        const entry=actual[index];
        const sourceId=`preview-${Date.now()}-${index}`;
        setScanStatus(`Analyzing ${index+1} of ${actual.length}: ${entry.name}`);
        setScanProgress(Math.round((index/actual.length)*100));
        const compressedImage=await compressImage(entry.file);
        try{
          const result=await analyzeScreenshot({
            idToken,
            imageDataUrl:compressedImage,
            fileName:entry.name,
            careerPhase:career.careerPhase || 'Player',
            player:career.player || {},
            recruitingSchools:(career.recruiting || []).map(({name})=>({name})),
            rosterPlayers:(career.retentionBoard || []).map(({name})=>({name})),
            uploadContext:null,
            suppressAnalysisEvent:true,
          });
          const analysis=result?.analysis || {};
          if((analysis.screenTypes || []).includes('ea_sports_network_article')){
            officialDetected+=1;
            setScanProgress(Math.round(((index+1)/actual.length)*100));
            continue;
          }
          const normalized=normalizeGameScreenshotAnalysis({
            analysis,
            sourceId,
            fileName:entry.name,
            previewUrl:compressedImage,
            uploadContext:null,
            recruiting:career.recruiting || [],
            retentionBoard:career.retentionBoard || [],
            careerPhase:career.careerPhase || 'Player',
          });
          draft=mergeScanResult(draft,normalized);
        }catch(error){
          draft=mergeScanResult(draft,createFailedScreenshotResult({
            sourceId,
            fileName:entry.name,
            previewUrl:compressedImage,
            message:error?.message || 'Screenshot analysis failed.',
            uploadContext:null,
          }));
        }
        setScanProgress(Math.round(((index+1)/actual.length)*100));
      }

      const rows=(draft.facts || [])
        .filter((fact)=>String(fact.key||'').startsWith('game.'))
        .map((fact)=>({...fact,selected:true}));
      setScanDraft(draft);
      setReviewRows(rows);
      const failed=(draft.sources || []).filter((source)=>source.error).length;
      if(officialDetected){
        notify(officialDetected===1
          ? 'EA SPORTS Network page detected in Game Data. It was not attached here—use the single optional EA upload in Coverage.'
          : officialDetected+' EA SPORTS Network pages were detected in Game Data. They were not attached here—use the single optional EA upload in Coverage.');
      }
      if(!rows.length){
        setScanError(officialDetected
          ? 'Only EA SPORTS Network coverage was detected. Continue to Coverage and use the dedicated optional EA SPORTS Network uploader.'
          : failed ? `No reliable game facts were found; ${failed} screen${failed===1?'':'s'} failed.` : 'No reliable game facts were found. Try tighter screenshots.');
      }else{
        setPhase('review');
      }
    }catch(error){
      setScanError(error?.message || 'The scanner could not analyze these screenshots.');
    }finally{
      setScanning(false);
      setScanStatus('');
      setScanProgress(0);
    }
  };

  const updateReviewRow=(id,patch)=>setReviewRows((current)=>current.map((row)=>row.id===id?{...row,...patch}:row));

  const scanRtgFiles=async(fileList)=>{
    const selected=[...(fileList||[])].filter((file)=>file?.type?.startsWith('image/')).slice(0,8);
    if(!selected.length || rtgScanning) return;
    if(!user){setRtgError('Connect your DynastyHQ account before scanning RTG screens.');return;}
    setRtgScanning(true);
    setRtgError('');
    setRtgFacts([]);
    setRtgScreens([]);
    setRtgSkipped(false);
    try{
      const idToken=await user.getIdToken();
      const facts=[];
      const screens=[];
      for(let index=0;index<selected.length;index+=1){
        const file=selected[index];
        setRtgProgress(`Analyzing ${index+1} of ${selected.length}: ${file.name}`);
        const imageDataUrl=await compressImage(file,2400,0.9);
        const result=await analyzeRtgStatusScreenshot({
          idToken,
          imageDataUrl,
          fileName:file.name,
          player:career.player || {},
        });
        const analysis=result?.analysis || {};
        screens.push({fileName:file.name,screenType:analysis.screenType || 'unknown',summary:analysis.summary || ''});
        (analysis.facts || []).forEach((fact,factIndex)=>facts.push({
          ...fact,
          id:`rtg-${index}-${factIndex}`,
          sourceName:file.name,
          selected:true,
        }));
      }
      setRtgScreens(screens);
      setRtgFacts(facts);
      if(!facts.length) setRtgError('No reliable RTG facts were found. Nothing was changed.');
    }catch(error){
      setRtgError(error?.message || 'RTG scanning failed.');
    }finally{
      setRtgScanning(false);
      setRtgProgress('');
    }
  };

  const updateRtgFact=(id,patch)=>setRtgFacts((current)=>current.map((fact)=>fact.id===id?{...fact,...patch}:fact));

  const scanOfficialArticleFiles=async(fileList)=>{
    const selected=[...(fileList||[])].filter((file)=>file?.type?.startsWith('image/')).slice(0,4);
    if(!selected.length || officialScanning) return;
    if(!user){
      setOfficialError('Connect your DynastyHQ account before scanning an EA Sports Network article.');
      return;
    }
    setOfficialScanning(true);
    setOfficialError('');
    try{
      const idToken=await user.getIdToken();
      const found=[];
      for(let index=0;index<selected.length;index+=1){
        const file=selected[index];
        setOfficialProgress(`Analyzing EA article ${index+1} of ${selected.length}: ${file.name}`);
        const imageDataUrl=await compressImage(file,2400,0.9);
        const result=await analyzeScreenshot({
          idToken,
          imageDataUrl,
          fileName:file.name,
          careerPhase:career.careerPhase || 'Player',
          player:career.player || {},
          recruitingSchools:(career.recruiting || []).map(({name})=>({name})),
          rosterPlayers:(career.retentionBoard || []).map(({name})=>({name})),
          uploadContext:null,
          suppressAnalysisEvent:true,
        });
        const analysis=result?.analysis || {};
        const official=analysis.officialArticle || null;
        const recognized=(analysis.screenTypes || []).includes('ea_sports_network_article') || Boolean(official);
        if(!recognized) continue;
        found.push({
          fileName:file.name,
          headline:official?.headline || analysis.screenTitle || 'EA SPORTS Network article',
          body:official?.body || '',
          byline:official?.byline || '',
          pageLabel:official?.pageLabel || '',
          imageDataUrl,
        });
      }
      if(!found.length){
        setOfficialError('No EA Sports Network article was recognized. Use a clear screenshot of the full in-game article page.');
        return;
      }
      const merged=mergeOfficialCoveragePages([...officialArticles,...found]);
      if(!merged){
        setOfficialError('The EA Sports Network pages could not be merged.');
        return;
      }
      let stitchedImageDataUrl='';
      let stitchMeta=null;
      try{
        setOfficialProgress('Cropping borders and stitching the EA article into one continuous page…');
        const stitched=await stitchOfficialArticlePages(
          (merged.sourcePages || []).map((page)=>page.imageDataUrl || page.screenshotUrl).filter(Boolean),
        );
        stitchedImageDataUrl=stitched.dataUrl;
        stitchMeta={
          width:stitched.width,
          height:stitched.height,
          pageCount:stitched.pageCount,
          overlaps:stitched.overlaps,
          generatedAt:new Date().toISOString(),
        };
      }catch(stitchError){
        console.warn('EA article auto-stitch preview failed',stitchError);
      }
      setOfficialArticles([{...merged,stitchedImageDataUrl,stitchMeta}]);
      setCoverageSkipped(false);
      notify(found.length===1 ? 'EA Sports Network article page added.' : found.length+' EA Sports Network pages auto-cropped and stitched.');
    }catch(error){
      setOfficialError(error?.message || 'The EA Sports Network article could not be scanned.');
    }finally{
      setOfficialScanning(false);
      setOfficialProgress('');
    }
  };

  const scanCoverageFiles=async(fileList)=>{
    const selected=[...(fileList||[])].filter((file)=>file?.type?.startsWith('image/')).slice(0,12);
    if(!selected.length || coverageScanning) return;
    if(!user){setCoverageError('Connect your DynastyHQ account before scanning Coverage Data.');return;}
    setCoverageScanning(true);
    setCoverageError('');
    setCoverageFacts([]);
    setCoverageScreens([]);
    setCoverageSkipped(false);
    try{
      const idToken=await user.getIdToken();
      const facts=[];
      const screens=[];
      const school=career.player?.college || career.player?.school || data.player.school || '';
      for(let index=0;index<selected.length;index+=1){
        const file=selected[index];
        setCoverageProgress(`Analyzing ${index+1} of ${selected.length}: ${file.name}`);
        const imageDataUrl=await compressImage(file,2000,0.88);
        const result=await analyzeCoverageReference({idToken,imageDataUrl,fileName:file.name,school});
        const analysis=result?.analysis || {};
        screens.push({fileName:file.name,screenType:analysis.screenType || 'unknown',summary:analysis.summary || ''});
        (analysis.facts || []).forEach((fact,factIndex)=>facts.push({
          ...fact,
          id:`coverage-${index}-${factIndex}`,
          sourceName:file.name,
          selected:Number(fact.confidence)>=0.65,
        }));
      }
      setCoverageScreens(screens);
      setCoverageFacts(facts);
      if(!facts.length) setCoverageError('No reliable coverage facts were found. Nothing was changed.');
    }catch(error){
      setCoverageError(error?.message || 'Coverage Data scanning failed.');
    }finally{
      setCoverageScanning(false);
      setCoverageProgress('');
    }
  };

  const updateCoverageFact=(id,patch)=>setCoverageFacts((current)=>current.map((fact)=>fact.id===id?{...fact,...patch}:fact));

  const selectedGameFacts=reviewRows.filter((row)=>row.selected && String(row.value??'').trim()!=='');
  const lowConfidence=reviewRows.filter((row)=>row.selected && Number(row.confidence||0)<0.75);
  const failedSources=(scanDraft?.sources || []).filter((source)=>source.error);
  const rtgApproved=rtgFacts.filter((fact)=>fact.selected!==false && String(fact.value??'').trim()!=='');
  const coverageApproved=coverageFacts.filter((fact)=>fact.selected && String(fact.value??'').trim()!=='');
  const coverageAdded=coverageApproved.length>0;
  const officialSaved=currentOfficialSaved || officialArticles.length>0;
  const readyGamePhotoCount=Number(publishResult?.gamePhotoCount ?? gamePhotos.length)||0;

  const rtg=data.rtg || {};
  const rtgCards=[
    ['OVR',data.player?.overall || '—'],
    ['ROLE',rtg.rank || rtg.role || rtg.currentRole || '—'],
    ['COACH TRUST',rtg.coachTrust ?? rtg.trust ?? '—'],
    ['SKILL POINTS',rtg.skillPoints ?? '—'],
    ['GPA',rtg.gpa ?? '—'],
  ];

  const recognizedCoverage={
    scoring:coverageScreens.some((entry)=>entry.screenType==='scoring_summary'),
    teammates:coverageScreens.some((entry)=>entry.screenType==='player_stats'),
    opponent:coverageScreens.some((entry)=>entry.screenType==='team_stats' || entry.screenType==='player_stats'),
  };

  const refreshPublishedCoverage=async({targetPublicationId,targetSeason,targetWeek,parts='both'})=>{
    if(coverageRefreshBusy) return coverageRefreshResult;
    const signedInUser=auth.currentUser;
    if(!signedInUser || !user || signedInUser.uid!==user.uid){
      const message='Your week was saved, but DynastyHQ could not start coverage generation because the owner session changed.';
      setCoverageRefreshError(message);
      return {newsroom:'failed',podcast:'failed',errors:[message]};
    }

    setCoverageRefreshBusy(true);
    setCoverageRefreshError('');
    setCoverageRefreshResult(null);

    const writeNewsroom=parts!=='podcast';
    const writePodcast=parts!=='newsroom';
    const outcome={
      newsroom:writeNewsroom?'pending':'unchanged',
      podcast:writePodcast?'pending':'unchanged',
      errors:[],
    };
    let newsroomEdition=null;
    let podcastEpisode=null;

    try{
      const baseState=await runTransaction(db,async(transaction)=>{
        const loaded=await readHydratedCareerInTransaction({
          transaction,
          db,
          appId:productionAppId,
          userId:signedInUser.uid,
        });
        if(!loaded) throw new Error('The saved week could not be reloaded for coverage generation.');
        const target=findPublishedWeekConflict(loaded.state,{
          season:targetSeason,
          week:targetWeek,
          weekKey:targetPublicationId,
        });
        if(!target) throw new Error('The saved week is no longer present, so coverage generation was stopped.');
        return loaded.state;
      });

      const idToken=await signedInUser.getIdToken();

      if(writeNewsroom) try{
        const newsroomPayload=buildNewsroomGenerationPayload(baseState,targetPublicationId);
        const generated=await generateNewsroomEdition({idToken,payload:newsroomPayload});
        newsroomEdition=normalizeGeneratedNewsroomEdition({
          generated:generated.edition,
          payload:newsroomPayload,
          model:generated.model,
        });
        outcome.newsroom='generated';
      }catch(error){
        if(error?.code==='NO_NEWSWORTHY_NEWSROOM' || /no new newsroom story/i.test(String(error?.message || ''))){
          outcome.newsroom='skipped';
        }else{
          outcome.newsroom='failed';
          outcome.errors.push(
            error?.name==='TypeError' && /failed to fetch|networkerror/i.test(String(error?.message || ''))
              ? 'Newsroom: Browser connection to the writing server was interrupted. The draft may have been generated but was not attached to this saved week. Use RETRY NEWSROOM ONLY to try again without rewriting your podcast.'
              : 'Newsroom: '+String(error?.message || 'generation failed')
          );
        }
      }

      if(writePodcast) try{
        const podcastPayload=buildPodcastGenerationPayload(baseState,targetPublicationId);
        const generated=await generatePodcastScript({
          idToken,
          payload:podcastPayload,
          prepareAudio:false,
        });
        const normalized=normalizeGeneratedPodcast({
          generated:generated.episode,
          payload:podcastPayload,
          model:generated.model,
        });
        const priorEpisode=(baseState.podcastEpisodes || []).find((entry)=>previewMatchesPublication(
          entry,
          targetPublicationId,
          targetSeason,
          targetWeek,
        ));
        const hadRecordedAudio=['ready','stale'].includes(priorEpisode?.audioStatus)
          || Boolean(priorEpisode?.masterAudioUploadedAt || priorEpisode?.audioGeneratedAt);
        podcastEpisode={
          ...normalized,
          // A regenerated transcript never deletes or replaces uploaded audio.
          // Keep the existing audio provenance while clearly marking it outdated.
          ...(priorEpisode ? {
            audioModel:priorEpisode.audioModel || '',
            audioGeneratedAt:priorEpisode.audioGeneratedAt || '',
          } : {}),
          audioStatus:hadRecordedAudio ? 'stale' : 'not-generated',
          ...(hadRecordedAudio ? {audioStaleAt:new Date().toISOString()} : {}),
        };
        outcome.podcast='generated';
      }catch(error){
        outcome.podcast='failed';
        outcome.errors.push('Podcast: '+String(error?.message || 'transcript generation failed'));
      }

      if(newsroomEdition || podcastEpisode){
        await runTransaction(db,async(transaction)=>{
          const loaded=await readHydratedCareerInTransaction({
            transaction,
            db,
            appId:productionAppId,
            userId:signedInUser.uid,
          });
          if(!loaded) throw new Error('DynastyHQ could not reload the career to attach generated coverage.');

          const remote=loaded.state;
          const target=findPublishedWeekConflict(remote,{
            season:targetSeason,
            week:targetWeek,
            weekKey:targetPublicationId,
          });
          if(!target) throw new Error('The selected week changed before generated coverage could be attached.');
          if(Number(remote._sync?.revision || 0)!==Number(baseState._sync?.revision || 0)){
            throw new Error('The career was updated while coverage was being generated. No coverage was replaced. Refresh and regenerate again from the newest saved facts.');
          }

          let nextState=remote;
          if(newsroomEdition){
            nextState=applyGeneratedNewsroomEdition(nextState,targetPublicationId,newsroomEdition);
            nextState={
              ...nextState,
              newsroomIssues:assignLibraryPhotosToEdition({
                issues:nextState.newsroomIssues || [],
                publicationId:targetPublicationId,
                mediaLibrary:nextState.newsroomMediaLibrary || [],
              }),
            };
            const savedIssue=(nextState.newsroomIssues || []).find((issue)=>previewMatchesPublication(
              issue,
              targetPublicationId,
              targetSeason,
              targetWeek,
            ));
            if(
              savedIssue?.editorialStatus!=='generated'
              || savedIssue?.editorialGeneratedAt!==newsroomEdition.generatedAt
            ){
              throw new Error('The generated Newsroom edition could not be attached to the selected week.');
            }
          }

          if(podcastEpisode){
            nextState=upsertPodcastEpisode(nextState,podcastEpisode);
            const savedEpisode=(nextState.podcastEpisodes || []).find((episode)=>previewMatchesPublication(
              episode,
              targetPublicationId,
              targetSeason,
              targetWeek,
            ));
            if(
              !savedEpisode?.segments?.length
              || savedEpisode?.generatedAt!==podcastEpisode.generatedAt
            ){
              throw new Error('The generated Podcast transcript could not be attached to the selected week.');
            }
          }

          const regression=detectDestructiveCareerRegression(remote,nextState);
          if(regression.blocked){
            throw new Error('DynastyHQ blocked generated coverage because the save would regress career history. '+regression.reason);
          }

          const remoteRevision=Number(loaded.rawMain?._sync?.revision)||0;
          const savedAt=new Date().toISOString();
          nextState={
            ...nextState,
            _sync:{
              revision:remoteRevision+1,
              deviceId:PREVIEW_WEEK_PROCESSOR_DEVICE_ID,
              updatedAt:savedAt,
            },
          };

          const storagePreview=splitCareerStateForStorage(nextState,savedAt);
          const mainBytes=estimatedJsonBytes(storagePreview.mainState);
          const largestArchiveBytes=storagePreview.archives.reduce(
            (largest,archive)=>Math.max(largest,estimatedJsonBytes(archive)),
            0,
          );
          if(mainBytes>=950*1024 || largestArchiveBytes>=950*1024){
            throw new Error('Generated coverage was not attached because the resulting DynastyHQ storage shard would be too large.');
          }

          // Save an immutable rollback checkpoint of the prior article/transcript
          // before replacing published coverage. The source game stays untouched.
          const checkpointId=`before-coverage-regeneration-${targetPublicationId}-${Date.now()}`;
          const beforeStorage=splitCareerStateForStorage(remote,savedAt);
          const beforeTargetArchive=beforeStorage.archives.find((archive)=>archive.archiveId===targetPublicationId) || null;
          const checkpointArchiveId=beforeTargetArchive ? `${checkpointId}-target` : '';
          const checkpointArchiveIds=beforeStorage.archives.map((archive)=>(
            beforeTargetArchive && archive.archiveId===targetPublicationId ? checkpointArchiveId : archive.archiveId
          ));
          const checkpointMain={
            ...beforeStorage.mainState,
            _storage:{
              ...(beforeStorage.mainState._storage || {}),
              archiveIds:checkpointArchiveIds,
            },
            _checkpoint:{
              immutable:true,
              createdAt:savedAt,
              reason:'Backup before coverage-only Newsroom and Podcast transcript regeneration.',
              targetPublicationId,
              action:'regenerate-coverage',
              originalArchiveIds:beforeStorage.archives.map((archive)=>archive.archiveId),
              targetArchiveBackupId:checkpointArchiveId,
            },
          };
          if(estimatedJsonBytes(checkpointMain)>=950*1024){
            throw new Error('Coverage regeneration was blocked because a safe rollback checkpoint could not be created.');
          }
          transaction.set(
            doc(db,'artifacts',productionAppId,'users',signedInUser.uid,'hq_data',checkpointId),
            checkpointMain,
          );
          if(beforeTargetArchive){
            const checkpointArchive={
              ...beforeTargetArchive,
              archiveId:checkpointArchiveId,
              _checkpointArchive:{
                immutable:true,
                createdAt:savedAt,
                targetPublicationId,
                originalArchiveId:beforeTargetArchive.archiveId,
              },
            };
            if(estimatedJsonBytes(checkpointArchive)>=950*1024){
              throw new Error('Coverage regeneration was blocked because the rollback archive is too large.');
            }
            transaction.set(
              careerArchiveRef({
                db,
                appId:productionAppId,
                userId:signedInUser.uid,
                archiveId:checkpointArchiveId,
              }),
              checkpointArchive,
            );
          }
          writeHydratedCareerInTransaction({
            transaction,
            db,
            appId:productionAppId,
            userId:signedInUser.uid,
            state:nextState,
          });
        });
      }

      const completed={...outcome};
      setCoverageRefreshResult(completed);
      if(outcome.errors.length){
        setCoverageRefreshError(outcome.errors.join(' · '));
      }else{
        notify(
          outcome.newsroom==='generated' && outcome.podcast==='generated'
            ? 'Newsroom coverage and The Huddle transcript are ready.'
            : outcome.newsroom==='generated'
              ? 'LSU Newsroom articles have been updated. Your podcast was left unchanged.'
              : outcome.podcast==='generated'
                ? 'Podcast transcript updated. Existing Newsroom articles were left unchanged.'
                : 'Postgame coverage refresh is complete.',
        );
      }
      return completed;
    }catch(error){
      const message=error?.message || 'The week was saved, but postgame coverage could not be refreshed.';
      setCoverageRefreshError(message);
      const failed={
        newsroom:outcome.newsroom==='pending'?'failed':outcome.newsroom,
        podcast:outcome.podcast==='pending'?'failed':outcome.podcast,
        errors:[...outcome.errors,message],
      };
      setCoverageRefreshResult(failed);
      return failed;
    }finally{
      setCoverageRefreshBusy(false);
    }
  };

  const publishVerifiedPacket=async()=>{
    if(publishing) return;
    const signedInUser=auth.currentUser;
    if(!signedInUser || !user || signedInUser.uid!==user.uid){
      setPublishError('Reconnect the same DynastyHQ account before publishing this verified week.');
      return;
    }
    const mediaOnlyUpdate=hasSavedGame && !selectedGameFacts.length;
    if(!selectedGameFacts.length && !hasSavedGame){
      setPublishError('At least one verified game-data fact is required before DynastyHQ can publish a new week.');
      return;
    }
    if(mediaOnlyUpdate && !officialArticles.length && !coverageApproved.length && !gamePhotos.length){
      setPublishError('Nothing new is attached yet. Add EA SPORTS Network pages, Coverage Data, or Game Photos before updating this saved week.');
      return;
    }

    const targetSeason=Number(data.season)||1;
    const targetWeek=Number(data.week)||0;
    const targetPublicationId=createWeekKey(targetSeason,targetWeek);
    const approvedGameFacts=selectedGameFacts.map(previewCleanFact);
    const approvedRtgFacts=rtgApproved.map(previewCleanFact);
    const approvedCoverageFacts=coverageApproved.map(previewCleanFact);
    const checkpointId=`before-redesign-${targetPublicationId}-${Date.now()}`;
    let uploadedGamePhotoAssets=[];
    let uploadedOfficialArticleMedia=[];
    let publishedOfficialArticles=officialArticles;
    let careerWriteCompleted=false;

    setPublishing(true);
    setPublishError('');
    setPublishResult(null);

    try{
      uploadedGamePhotoAssets=await uploadGamePhotoAssets({
        signedInUser,
        targetPublicationId,
        targetSeason,
        targetWeek,
      });
      const officialUpload=await uploadOfficialArticleScreenshots({
        signedInUser,
        targetPublicationId,
        targetSeason,
        targetWeek,
      });
      publishedOfficialArticles=officialUpload.articles;
      uploadedOfficialArticleMedia=officialUpload.uploaded;

      const result=await runTransaction(db,async(transaction)=>{
        const loaded=await readHydratedCareerInTransaction({
          transaction,
          db,
          appId:productionAppId,
          userId:signedInUser.uid,
        });
        if(!loaded) throw new Error('Your live DynastyHQ career could not be loaded. Nothing was written.');

        const remote=loaded.state;
        const conflict=findPublishedWeekConflict(remote,{
          season:targetSeason,
          week:targetWeek,
          weekKey:targetPublicationId,
        });

        if(conflict && !hasSavedGame){
          const error=new Error('This week was published after you opened Week Processing. DynastyHQ preserved the newer cloud version. Close the processor, refresh the week, and review it before making any correction.');
          error.code='SAVE_CONFLICT';
          throw error;
        }
        if(!conflict && hasSavedGame){
          const error=new Error('The selected week changed in the cloud after you opened Week Processing. DynastyHQ blocked the write so a stale screen cannot recreate or overwrite it.');
          error.code='SAVE_CONFLICT';
          throw error;
        }

        let nextState=remote;
        let action='published';

        if(conflict){
          const gameIndex=(remote.gameLogs || []).findIndex((entry)=>(
            Number(entry?.season || 1)===targetSeason && Number(entry?.week)===targetWeek
          ));
          if(gameIndex<0){
            const error=new Error('This week is already published as a non-game update. The Game Data workflow will not overwrite it.');
            error.code='PUBLISHED_NON_GAME';
            throw error;
          }

          if(mediaOnlyUpdate){
            // Optional-media pass-through: preserve the already verified game and RTG
            // exactly as they exist in cloud storage. Only the optional sections below
            // are allowed to change.
            nextState=remote;
            action='updated';
          }else{
            const correctedGame=previewGameFromFacts({
              baseGame:remote.gameLogs[gameIndex] || {},
              facts:approvedGameFacts,
              fallbackOpponent:data.game?.opponent || '',
            });

            nextState=correctPublishedWeek({
              state:remote,
              gameIndex,
              game:correctedGame,
            });
            nextState=mergeVerifiedPublicationFacts(nextState,targetPublicationId,approvedGameFacts);
            nextState=applyCorrectedRtgSnapshot(nextState,{
              publicationId:targetPublicationId,
              season:targetSeason,
              week:targetWeek,
              facts:approvedRtgFacts,
            });
            action='updated';
          }
        }else{
          const currentPublicationId=createWeekKey(
            Number(remote.currentSeason)||1,
            Number(remote.currentWeek)||1,
          );
          if(currentPublicationId!==targetPublicationId){
            const error=new Error(
              `This packet belongs to Season ${targetSeason}, Week ${targetWeek}, but the live career is currently waiting for ${currentPublicationId.replace('season-','Season ').replace('-week-',', Week ')}. DynastyHQ blocked the stale write.`,
            );
            error.code='STALE_WEEK';
            throw error;
          }

          const setup=remote.currentWeekSetup || {};
          const publishGame=previewGameFromFacts({
            baseGame:{
              opponent:setup.opponent || data.game?.opponent || '',
              result:'',
              homeScore:'',
              awayScore:'',
              passYds:'',
              passTD:'',
              rushYds:'',
              rushTD:'',
              int:'',
              isConferenceGame:typeof setup.isConferenceGame==='boolean' ? setup.isConferenceGame : undefined,
              conferenceGameSource:setup.conferenceGameSource || 'auto',
            },
            facts:approvedGameFacts,
            fallbackOpponent:setup.opponent || data.game?.opponent || '',
          });

          if(!String(publishGame.opponent || '').trim()){
            throw new Error('Opponent is missing from the verified packet and current-week setup.');
          }
          if(!String(publishGame.result || '').trim()){
            const teamScore=Number(publishGame.homeScore);
            const opponentScore=Number(publishGame.awayScore);
            if(Number.isFinite(teamScore) && Number.isFinite(opponentScore) && teamScore!==opponentScore){
              publishGame.result=teamScore>opponentScore?'W':'L';
            }
          }

          const requiredFields=[
            ['result','Result'],
            ['homeScore','Team score'],
            ['awayScore','Opponent score'],
            ['passYds','Passing yards'],
            ['passTD','Passing touchdowns'],
            ['rushYds','Rushing yards'],
            ['rushTD','Rushing touchdowns'],
            ['int','Interceptions'],
          ];
          const missing=requiredFields.filter(([field])=>publishGame[field]==='' || publishGame[field]===null || publishGame[field]===undefined);
          if(missing.length){
            throw new Error('The verified packet is missing: '+missing.map(([,label])=>label).join(', ')+'. Return to Review before publishing.');
          }

          const nextRtg=previewRtgFromFacts(remote.rtg || {},approvedRtgFacts);
          nextState=createPublishedWeek({
            state:remote,
            game:publishGame,
            rtg:nextRtg,
            coach:remote.coach,
            facts:[...approvedGameFacts,...approvedRtgFacts],
            sources:(scanDraft?.sources || []).map((source)=>({
              id:source.id,
              fileName:source.fileName,
              detectedTypes:source.detectedTypes,
              error:source.error || '',
            })),
            weekType:scanDraft?.weekType || 'game',
            season:targetSeason,
            week:targetWeek,
            weekKey:targetPublicationId,
          });
        }

        if(approvedCoverageFacts.length){
          nextState=replaceCoverageReferences(nextState,{
            publicationId:targetPublicationId,
            season:targetSeason,
            week:targetWeek,
            facts:approvedCoverageFacts,
            sourceCount:coverageScreens.length,
          });
        }

        nextState=appendOfficialNetworkArticles(nextState,{
          publicationId:targetPublicationId,
          season:targetSeason,
          week:targetWeek,
          articles:publishedOfficialArticles,
        });

        if(uploadedGamePhotoAssets.length){
          const existingIds=new Set((nextState.newsroomMediaLibrary || []).map((asset)=>asset?.id).filter(Boolean));
          nextState={
            ...nextState,
            newsroomMediaLibrary:[
              ...(nextState.newsroomMediaLibrary || []),
              ...uploadedGamePhotoAssets.filter((asset)=>!existingIds.has(asset.id)),
            ],
          };
        }

        const regression=detectDestructiveCareerRegression(remote,nextState);
        if(regression.blocked){
          const error=new Error('DynastyHQ blocked the save because it would remove or roll back published career history. '+regression.reason);
          error.code='CAREER_REGRESSION_BLOCKED';
          throw error;
        }

        const remoteRevision=Number(loaded.rawMain?._sync?.revision)||0;
        const savedAt=new Date().toISOString();
        nextState={
          ...nextState,
          _sync:{
            revision:remoteRevision+1,
            deviceId:PREVIEW_WEEK_PROCESSOR_DEVICE_ID,
            updatedAt:savedAt,
          },
        };

        const storagePreview=splitCareerStateForStorage(nextState,savedAt);
        const mainBytes=estimatedJsonBytes(storagePreview.mainState);
        const largestArchiveBytes=storagePreview.archives.reduce(
          (largest,archive)=>Math.max(largest,estimatedJsonBytes(archive)),
          0,
        );
        if(mainBytes>=950*1024 || largestArchiveBytes>=950*1024){
          const error=new Error(
            mainBytes>=950*1024
              ? `The compact DynastyHQ master would be too large (${Math.round(mainBytes/1024)} KB). Nothing was written.`
              : `The selected week archive would be too large (${Math.round(largestArchiveBytes/1024)} KB). Nothing was written.`,
          );
          error.code='STORAGE_SHARD_TOO_LARGE';
          throw error;
        }

        const beforeStorage=splitCareerStateForStorage(remote,savedAt);
        const beforeTargetArchive=beforeStorage.archives.find((archive)=>archive.archiveId===targetPublicationId) || null;
        const checkpointArchiveId=beforeTargetArchive ? `${checkpointId}-target` : '';
        const checkpointArchiveIds=beforeStorage.archives.map((archive)=>(
          beforeTargetArchive && archive.archiveId===targetPublicationId ? checkpointArchiveId : archive.archiveId
        ));
        const checkpointMain={
          ...beforeStorage.mainState,
          _storage:{
            ...(beforeStorage.mainState._storage || {}),
            archiveIds:checkpointArchiveIds,
          },
          _checkpoint:{
            immutable:true,
            createdAt:savedAt,
            reason:'Automatic safety checkpoint before redesign Week Processing write.',
            targetPublicationId,
            action,
            originalArchiveIds:beforeStorage.archives.map((archive)=>archive.archiveId),
            targetArchiveBackupId:checkpointArchiveId,
          },
        };
        if(estimatedJsonBytes(checkpointMain)>=950*1024){
          throw new Error('DynastyHQ could not create the pre-write safety checkpoint, so the week was not published.');
        }
        transaction.set(
          doc(db,'artifacts',productionAppId,'users',signedInUser.uid,'hq_data',checkpointId),
          checkpointMain,
        );
        if(beforeTargetArchive){
          const checkpointArchive={
            ...beforeTargetArchive,
            archiveId:checkpointArchiveId,
            _checkpointArchive:{
              immutable:true,
              createdAt:savedAt,
              targetPublicationId,
              originalArchiveId:beforeTargetArchive.archiveId,
            },
          };
          if(estimatedJsonBytes(checkpointArchive)>=950*1024){
            throw new Error('The existing week is too large to checkpoint safely, so DynastyHQ blocked the update.');
          }
          transaction.set(
            careerArchiveRef({
              db,
              appId:productionAppId,
              userId:signedInUser.uid,
              archiveId:checkpointArchiveId,
            }),
            checkpointArchive,
          );
        }

        writeHydratedCareerInTransaction({
          transaction,
          db,
          appId:productionAppId,
          userId:signedInUser.uid,
          state:nextState,
        });

        return {
          action,
          publicationId:targetPublicationId,
          savedAt,
          nextWeek:Number(nextState.currentWeek)||targetWeek,
          gameFactCount:approvedGameFacts.length,
          rtgFactCount:approvedRtgFacts.length,
          coverageFactCount:approvedCoverageFacts.length,
          officialArticleCount:publishedOfficialArticles.length,
          gamePhotoCount:uploadedGamePhotoAssets.length,
          mediaOnlyUpdate,
          checkpointId,
        };
      });

      careerWriteCompleted=true;
      setPublishResult(result);
      setPublishConfirm(false);
      revokeFiles(gamePhotos);
      setGamePhotos([]);
      setGamePhotosSkipped(false);
      setPublishing(false);
      const optionalMediaOnly=result.mediaOnlyUpdate && !approvedCoverageFacts.length;
      notify(
        optionalMediaOnly
          ? `Season ${targetSeason}, Week ${targetWeek} optional media was safely updated. Existing verified game data was preserved.`
          : result.action==='updated'
            ? `Season ${targetSeason}, Week ${targetWeek} was safely updated. Refreshing Newsroom and Podcast coverage now.`
            : `Season ${targetSeason}, Week ${targetWeek} was safely published. Building Newsroom and Podcast coverage now.`,
      );
      if(optionalMediaOnly){
        setCoverageRefreshResult({newsroom:'skipped',podcast:'skipped',errors:[]});
      }else{
        await refreshPublishedCoverage({
          targetPublicationId,
          targetSeason,
          targetWeek,
        });
      }
    }catch(error){
      if(!careerWriteCompleted && uploadedGamePhotoAssets.length){
        await Promise.allSettled(uploadedGamePhotoAssets.map((asset)=>deleteNewsroomMedia({firebaseApp,storagePath:asset.storagePath})));
      }
      if(!careerWriteCompleted && uploadedOfficialArticleMedia.length){
        await Promise.allSettled(uploadedOfficialArticleMedia.map((entry)=>deleteNewsroomMedia({firebaseApp,storagePath:entry.storagePath})));
      }
      setGamePhotoError(error?.message || '');
      setPublishError(error?.message || 'DynastyHQ could not publish this verified week. Nothing was intentionally changed.');
    }finally{
      setPublishing(false);
    }
  };

  const closeSafe=()=>{
    if(scanning || rtgScanning || coverageScanning || gamePhotoUploading || publishing || coverageRefreshBusy) return;
    revokeFiles(files);
    revokeFiles(gamePhotos);
    onClose();
  };

  return <div className="processing-center" role="dialog" aria-modal="true" aria-label="Week Processing Center">
    <div className="processing-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)closeSafe()}}>
      <section className="processing-shell">
        <header className="processing-topbar">
          <button className="processing-brand" onClick={closeSafe}>DYNASTY<span>HQ</span></button>
          <div className="processing-context">
            <span>{phase==='regenerate'?'COVERAGE REGENERATION':'WEEK PROCESSING CENTER'}</span>
            <b>SEASON {data.season} · {weekDisplayLabel} · {data.player.school} vs {game.opponent}</b>
          </div>
          <div className="processing-safety"><ShieldCheck/><span>REAL SCANNERS · DRAFT UNTIL CONFIRMED</span></div>
          <button className="processing-close" onClick={closeSafe} aria-label="Close Processing Center"><X/></button>
        </header>

        {phase!=='regenerate' && <nav className="processing-steps" aria-label="Processing steps">
          {steps.map(([id,label,Icon],index)=><React.Fragment key={id}>
            <button className={(phase===id?'current ':'')+(index<phaseIndex?'complete':'')} onClick={()=>index<=phaseIndex && !publishing && setPhase(id)} disabled={publishing || index>phaseIndex}>
              <i>{index<phaseIndex?<Check/>:<Icon/>}</i>
              <span><small>STEP {index+1}</small><b>{label}</b></span>
            </button>
            {index<steps.length-1 && <em className={index<phaseIndex?'complete':''}/>}
          </React.Fragment>)}
        </nav>}

        {hasSavedGame && phase!=='regenerate' && <div className="coverage-regen-shortcut">
          <div><Sparkles/><span><strong>Already published this week?</strong><small>Rebuild Newsroom articles and the podcast transcript without re-uploading or republishing game data.</small></span></div>
          <button type="button" disabled={publishing || coverageRefreshBusy} onClick={()=>{setPhase('regenerate');setRegenerateConfirm(false);setCoverageRefreshResult(null);setCoverageRefreshError('')}}>REGENERATE COVERAGE</button>
        </div>}

        <main className="processing-main">
          {phase==='regenerate' && <section className="processing-stage coverage-regen-stage">
            <div className="processing-stage-head">
              <span>SAVED GAME · COVERAGE ONLY</span>
              <h1>REGENERATE NEWSROOM + PODCAST</h1>
              <p>Season {data.season} · {weekDisplayLabel} · {data.player.school} vs {game.opponent}. Use this after changing the playoff round or location. The existing game results, player stats, progression, Game Photos, and EA SPORTS Network uploads will stay as saved.</p>
            </div>
            {!hasSavedGame ? <div className="coverage-refresh-card warning"><Shield/><span><b>NO PUBLISHED GAME FOUND</b><small>Select a completed saved week before rebuilding its coverage.</small></span></div> : <>
              <div className="coverage-regen-target">
                <div><ShieldCheck/><span><b>Uses your latest saved verified facts</b><small>Updates the Newsroom articles, Podcast transcript and NotebookLM material for this selected week only.</small></span></div>
                <div><Headphones/><span><b>Existing audio is preserved</b><small>Any attached recording remains saved but is marked stale if the transcript changes. New audio must be created separately.</small></span></div>
                <div><LockKeyhole/><span><b>Shared career save</b><small>This preview connects to your real saved career. Regeneration replaces the selected published editorial text only after your confirmation and makes a safety checkpoint first.</small></span></div>
              </div>
              {!regenerateConfirm && !coverageRefreshBusy && !coverageRefreshResult && <div className="coverage-regen-actions">
                <button type="button" className="secondary" onClick={()=>setPhase('game')}>BACK TO WEEK PROCESSING</button>
                <button type="button" className="secondary" onClick={()=>{setRegenerateTarget('newsroom');setRegenerateConfirm(true)}}><Newspaper/>NEWSROOM ONLY</button>
                <button type="button" className="secondary" onClick={()=>{setRegenerateTarget('podcast');setRegenerateConfirm(true)}}><Mic2/>PODCAST ONLY</button>
                <button type="button" className="primary" onClick={()=>{setRegenerateTarget('both');setRegenerateConfirm(true)}}><Sparkles/>NEWSROOM + PODCAST</button>
              </div>}
              {regenerateConfirm && !coverageRefreshBusy && !coverageRefreshResult && <div className="coverage-regen-confirm">
                <strong>{regenerateTarget==='newsroom'
                  ? "Regenerate this week's Newsroom articles only?"
                  : regenerateTarget==='podcast'
                    ? "Regenerate this week's podcast transcript only?"
                    : "Replace this week's saved Newsroom text and podcast transcript?"}</strong>
                <p>{regenerateTarget==='newsroom'
                  ? 'Only the selected Newsroom articles will be rewritten. Your already-generated podcast transcript, NotebookLM audio, game data and photos will not be changed.'
                  : regenerateTarget==='podcast'
                    ? 'Only the saved podcast transcript will be rewritten. Your Newsroom articles will remain unchanged, and any existing audio is preserved but marked outdated.'
                    : 'Your game data and existing audio files will remain in place. A checkpoint will preserve the previous editorial version for recovery.'}</p>
                <div className="coverage-regen-actions">
                  <button type="button" className="secondary" onClick={()=>setRegenerateConfirm(false)}>CANCEL</button>
                  <button type="button" className="primary" onClick={()=>refreshPublishedCoverage({targetPublicationId:publicationId,targetSeason:Number(data.season)||1,targetWeek:Number(data.week)||0,parts:regenerateTarget})}><Sparkles/>{regenerateTarget==='newsroom'?'YES · NEWSROOM ONLY':regenerateTarget==='podcast'?'YES · PODCAST ONLY':'YES · REGENERATE BOTH'}</button>
                </div>
              </div>}
              {coverageRefreshBusy && <div className="coverage-refresh-card busy"><Sparkles/><span><b>REGENERATING SAVED COVERAGE</b><small>{regenerateTarget==='newsroom'
                ? 'Writing just your Newsroom articles from confirmed playoff details. The podcast will stay untouched.'
                : 'Writing new articles and transcript from your confirmed playoff details.'} Keep this window open.</small></span></div>}
              {!coverageRefreshBusy && coverageRefreshResult && <div className={'coverage-refresh-card '+(coverageRefreshError?'warning':'success')}>
                {coverageRefreshError?<Shield/>:<Check/>}
                <span><b>{coverageRefreshError?'REGENERATION NEEDS ATTENTION':'COVERAGE REGENERATION COMPLETE'}</b>
                <small>Newsroom: {coverageRefreshResult.newsroom==='generated'?'updated':coverageRefreshResult.newsroom==='skipped'?'skipped':coverageRefreshResult.newsroom==='unchanged'?'left unchanged':'not updated'} · Podcast transcript: {coverageRefreshResult.podcast==='generated'?'updated':coverageRefreshResult.podcast==='unchanged'?'left unchanged':'not updated'}.</small>
                {coverageRefreshError ? <em>{coverageRefreshError}</em> : null}</span>
              </div>}
              {!coverageRefreshBusy && coverageRefreshResult && <div className="coverage-regen-actions">
                <button type="button" className="secondary" onClick={closeSafe}>CLOSE</button>
                {coverageRefreshResult.newsroom==='failed' && <button type="button" className="primary" onClick={()=>{
                  setRegenerateTarget('newsroom');
                  setCoverageRefreshResult(null);
                  setCoverageRefreshError('');
                  setRegenerateConfirm(true);
                }}><Newspaper/>RETRY NEWSROOM ONLY</button>}
                {coverageRefreshResult.podcast==='failed' && <button type="button" className="primary" onClick={()=>{
                  setRegenerateTarget('podcast');
                  setCoverageRefreshResult(null);
                  setCoverageRefreshError('');
                  setRegenerateConfirm(true);
                }}><Mic2/>RETRY PODCAST ONLY</button>}
                {coverageRefreshResult.newsroom!=='failed' && coverageRefreshResult.podcast!=='failed' && <button type="button" className="secondary" onClick={()=>{setCoverageRefreshResult(null);setCoverageRefreshError('');setRegenerateConfirm(false)}}><Sparkles/>MORE OPTIONS</button>}
              </div>}
            </>}
          </section>}

          {phase==='game' && <section className="processing-stage processing-game">
            <div className="processing-stage-head">
              <span>STEP 1 · GAME DATA</span>
              <h1>START WITH WHAT HAPPENED ON THE FIELD.</h1>
              <p>This lane uses the same verified Game Data scanner as the current DynastyHQ workflow. Scans and edits stay in a temporary packet until you explicitly confirm the final save in Step 5.</p>
            </div>

            <div className="scanner-engine-note"><ShieldCheck/><span><b>Existing scanner engine connected</b><small>Same game/box-score rules, Total Offense safeguards, TD recovery, retry logic and free-first AI routing.</small></span></div>

            <div className="processing-game-grid">
              <div className="processing-upload-side">
                <button className={'processing-drop '+(dragging?'dragging':'')} onClick={()=>inputRef.current?.click()} onDragEnter={(event)=>{event.preventDefault();setDragging(true)}} onDragOver={(event)=>event.preventDefault()} onDragLeave={(event)=>{event.preventDefault();setDragging(false)}} onDrop={(event)=>{event.preventDefault();setDragging(false);addFiles(event.dataTransfer.files)}}>
                  <span><Upload/></span>
                  <strong>{files.length?'ADD MORE GAME SCREENS':'DROP GAME SCREENSHOTS HERE'}</strong>
                  <small>Final score · Player stats · Team stats · Scoring summary</small>
                  <em>Choose Screens</em>
                </button>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event)=>{addFiles(event.target.files);event.target.value=''}}/>

                {files.length ? <div className="processing-queue">
                  <header><span>{files.length} SCREEN{files.length===1?'':'S'} READY · MAX 30</span><button onClick={()=>{revokeFiles(files);setFiles([])}}>Clear</button></header>
                  <div className="processing-file-grid">
                    {files.map((file,index)=><article key={file.id}>
                      <div className="processing-thumb">{file.url?<img src={file.url} alt=""/>:<ImageIcon/>}</div>
                      <span><small>{String(index+1).padStart(2,'0')}</small><b>{file.label || file.name}</b><em>{file.virtual?'Saved-week demo':file.name}</em></span>
                      <button onClick={()=>removeFile(file.id)} aria-label={`Remove ${file.name}`}><X/></button>
                    </article>)}
                  </div>
                </div> : <div className="processing-demo-prompt">
                  <Sparkles/>
                  <div><b>Want to test the layout without spending a scan?</b><small>Load the selected saved week into the same review screen locally.</small></div>
                  <button disabled={!hasSavedGame} onClick={loadSavedDemo}>{hasSavedGame?'LOAD SAVED WEEK':'NO SAVED GAME'}</button>
                </div>}

                {(scanning || scanStatus) && <div className="real-scan-progress"><div><span style={{width:`${scanProgress}%`}}/></div><p>{scanStatus || 'Analyzing…'}</p></div>}
                {scanError && <div className="scanner-error"><Shield/><span>{scanError}</span></div>}
              </div>

              <aside className="processing-needs">
                <span>WHAT THE SCANNER READS</span>
                <h3>Same fields as the current workflow.</h3>
                {[
                  ['Final score + opponent','Result, tracked-team score and opponent score.',true],
                  ['Your player line','Pass YDS/TD, rush YDS/TD and interceptions.',true],
                  ['Team comparison','Total Offense, first downs, turnovers, rush/pass yards.',false],
                  ['Rankings','Only when visibly attached to the correct team.',false],
                ].map(([title,sub,required])=><div key={title}><i className={required?'required':''}>{required?<Check/>:<PlusIcon/>}</i><span><b>{title}</b><small>{sub}</small></span><em>{required?'CORE':'SUPPORTED'}</em></div>)}
                <p><ShieldCheck/>Visible zeroes remain valid. Cropped or ambiguous values are omitted instead of guessed.</p>
              </aside>
            </div>

            {hasSavedGame && <div className="processing-saved-shortcut">
              <ShieldCheck/>
              <span><b>THIS WEEK IS ALREADY SAVED.</b><small>You can leave the verified game and RTG data untouched and jump straight to optional Coverage, EA SPORTS Network, or Game Photos.</small></span>
              <button className="secondary" disabled={scanning} onClick={()=>{setRtgSkipped(true);setCoverageSkipped(false);setPhase('coverage')}}>SKIP TO OPTIONAL COVERAGE<ChevronRight/></button>
            </div>}
            <div className="processing-actions">
              <button className="secondary" onClick={closeSafe}>CANCEL</button>
              <button className="primary" disabled={!files.length||scanning} onClick={scanGameData}>{scanning?'RUNNING REAL SCANNER…':'SCAN GAME DATA'}<ChevronRight/></button>
            </div>
          </section>}

          {phase==='review' && <section className="processing-stage processing-review">
            <div className="processing-stage-head">
              <span>STEP 2 · REVIEW</span>
              <h1>VERIFY THE WEEK BEFORE IT COUNTS.</h1>
              <p>These are the facts returned by the existing scanner engine. Editing or unchecking them changes only this temporary packet until the final confirmation step.</p>
            </div>

            <div className="review-summary-bar">
              <div><strong>{files.length}</strong><small>SCREENS</small></div>
              <div><strong>{selectedGameFacts.length}</strong><small>GAME FACTS</small></div>
              <div><strong>{lowConfidence.length+failedSources.length}</strong><small>NEEDS REVIEW</small></div>
              <span>REAL ANALYSIS · DRAFT REVIEW</span>
            </div>

            {officialArticles.length>0 && <div className="official-scan-detected"><RadioIcon/><span><b>EA SPORTS NETWORK ARTICLE · DETECTED</b><small>{officialArticles.map((entry)=>entry.headline).filter(Boolean).join(' · ')}</small></span><em>{officialArticles.length} PAGE{officialArticles.length===1?'':'S'}</em></div>}

            <div className="review-layout">
              <article className="verified-facts-panel real-review-panel">
                <header><span><Check/>EXTRACTED GAME FACTS</span><b>{reviewRows.length} detected</b></header>
                {reviewRows.length ? <div className="real-review-rows">
                  {reviewRows.map((row)=><div key={row.id} className={!row.selected?'ignored':''}>
                    <button className="review-toggle" onClick={()=>updateReviewRow(row.id,{selected:!row.selected})}>{row.selected?<Check/>:<X/>}</button>
                    <span><b>{row.label || row.key}</b><small>{row.evidence || row.key}</small></span>
                    <em>{Math.round((Number(row.confidence)||0)*100)}%</em>
                    <input value={row.value ?? ''} onChange={(event)=>updateReviewRow(row.id,{value:event.target.value,selected:true})}/>
                  </div>)}
                </div> : <div className="empty-scan-result"><Shield/><span><b>No game facts extracted</b><small>Return to Game Data and try a clearer screenshot.</small></span></div>}
              </article>

              <aside className="flagged-panel">
                <header><span>NEEDS REVIEW</span><strong>{lowConfidence.length+failedSources.length}</strong></header>
                {lowConfidence.map((row)=><div key={`low-${row.id}`}><Shield/><span><b>{row.label || row.key}</b><small>{Math.round((Number(row.confidence)||0)*100)}% confidence · verify the visible value.</small></span><button onClick={()=>updateReviewRow(row.id,{selected:true})}>KEEP</button></div>)}
                {failedSources.map((source,index)=><div key={source.id||index}><Shield/><span><b>{source.fileName || 'Screenshot failed'}</b><small>{source.error || 'Scanner could not classify this screen.'}</small></span></div>)}
                {!lowConfidence.length && !failedSources.length && <div className="all-clear"><Check/><span><b>No scanner warnings</b><small>All extracted game facts cleared the preview confidence check.</small></span></div>}
                <button className="advanced-review" onClick={()=>notify('This review is already using the real scanner output. Source-by-source image highlighting can be added later.')}><Pencil/>SOURCE DETAILS</button>
              </aside>
            </div>

            <div className="processing-actions">
              <button className="secondary" onClick={()=>setPhase('game')}><ChevronLeft/>GAME DATA</button>
              <button className="primary" disabled={!selectedGameFacts.length && !officialArticles.length} onClick={()=>setPhase('rtg')}>ACCEPT INTO VERIFIED PACKET<ChevronRight/></button>
            </div>
          </section>}

          {phase==='rtg' && <section className="processing-stage processing-rtg">
            <div className="processing-stage-head">
              <span>STEP 3 · RTG STATUS</span>
              <h1>CHECK THE PLAYER, NOT THE BOX SCORE.</h1>
              <p>This lane now calls the same RTG Status scanner used by the current site for Overview, Academics, Leadership, Health, Fitness and Brand screens.</p>
            </div>

            <div className="scanner-engine-note"><Sparkles/><span><b>RTG Status scanner connected</b><small>Weekly Points stay separate from Energy; NIL weekly cost stays separate from valuation; unsupported values are omitted.</small></span></div>

            <div className="rtg-status-grid">
              {rtgCards.map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong><span>SAVED</span></div>)}
            </div>

            <div className="rtg-upload-card real-scanner-upload">
              <div className="rtg-player-mark"><UserRound/></div>
              <div><span>PLAYER STATUS CHECK</span><h3>{data.player.name} · #{data.player.number} · {data.player.pos}</h3><p>Upload up to 8 current RTG screens together. Extracted values stay in the draft packet until Step 5 confirmation.</p></div>
              <button disabled={rtgScanning} onClick={()=>rtgInputRef.current?.click()}>{rtgScanning?<><Sparkles/>SCANNING…</>:<><Upload/>UPLOAD RTG SCREENS</>}</button>
              <input ref={rtgInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>{scanRtgFiles(event.target.files);event.target.value=''}}/>
            </div>

            {rtgProgress && <div className="scanner-inline-status"><Sparkles/><span>{rtgProgress}</span></div>}
            {rtgError && <div className="scanner-error scanner-inline"><Shield/><span>{rtgError}</span></div>}

            {rtgScreens.length>0 && <div className="detected-screen-strip">
              <span>DETECTED SCREENS</span>
              <div>{rtgScreens.map((entry,index)=><b key={`${entry.fileName}-${index}`} className={entry.screenType==='unknown'?'unknown':''}>{entry.screenType.replaceAll('_',' ')}</b>)}</div>
            </div>}

            {rtgFacts.length>0 && <div className="scanner-fact-review">
              <header><span>RTG FACTS · DRAFT PACKET</span><b>{rtgApproved.length} selected</b></header>
              {rtgFacts.map((fact)=><div key={fact.id} className={fact.selected===false?'ignored':''}>
                <button onClick={()=>updateRtgFact(fact.id,{selected:fact.selected===false})}>{fact.selected===false?<X/>:<Check/>}</button>
                <span><b>{fact.label || fact.key}</b><small>{fact.evidence || fact.sourceName}</small></span>
                <em>{Math.round((Number(fact.confidence)||0)*100)}%</em>
                <input value={fact.value ?? ''} onChange={(event)=>updateRtgFact(fact.id,{value:event.target.value,selected:true})}/>
              </div>)}
            </div>}

            <div className="processing-actions">
              <button className="secondary" onClick={()=>setPhase('review')}><ChevronLeft/>REVIEW</button>
              <button className="secondary" onClick={()=>{setRtgSkipped(true);setPhase('coverage')}}>SKIP · NOTHING CHANGED</button>
              <button className="primary" disabled={rtgScanning} onClick={()=>setPhase('coverage')}>{rtgApproved.length?'ACCEPT RTG INTO PACKET':'CONTINUE WITHOUT RTG'}<ChevronRight/></button>
            </div>
          </section>}

          {phase==='coverage' && <section className="processing-stage processing-coverage">
            <div className="processing-stage-head">
              <span>STEP 4 · COVERAGE</span>
              <h1>ADD CONTEXT ONLY IF THE STORY NEEDS IT.</h1>
              <p>This lane now uses the same Coverage Data scanner that reads teammate/opponent Player Stats, Team Stats and Scoring Summary screens for editorial use only.</p>
            </div>

            <div className="scanner-engine-note"><Newspaper/><span><b>Coverage scanner connected</b><small>Receiving rows, scoring plays and team notes remain editorial-only and cannot contaminate your official player line.</small></span></div>

            <div className="coverage-choice-grid">
              {[
                ['scoring','Scoring Summary',ClipboardList,'Accurate scoring plays and game-flow context.',recognizedCoverage.scoring],
                ['teammates','Player Stats',UserRound,'Supporting teammate/opponent performances.',recognizedCoverage.teammates],
                ['opponent','Team Stats',BarChart3,'Team-level editorial context.',recognizedCoverage.opponent],
              ].map(([key,title,Icon,sub,detected])=><div key={key} className={detected?'selected':''}>
                <i><Icon/></i><span><b>{title}</b><small>{sub}</small></span><em>{detected?<><Check/>DETECTED</>:'SUPPORTED'}</em>
              </div>)}
            </div>

            <div className="coverage-real-upload">
              <div><Upload/><span><b>UPLOAD COVERAGE SCREENS</b><small>Up to 12 screenshots · optional</small></span></div>
              <button disabled={coverageScanning} onClick={()=>coverageInputRef.current?.click()}>{coverageScanning?'SCANNING…':'CHOOSE COVERAGE'}</button>
              <input ref={coverageInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>{scanCoverageFiles(event.target.files);event.target.value=''}}/>
            </div>

            {coverageProgress && <div className="scanner-inline-status"><Newspaper/><span>{coverageProgress}</span></div>}
            {coverageError && <div className="scanner-error scanner-inline"><Shield/><span>{coverageError}</span></div>}

            {coverageFacts.length>0 && <div className="scanner-fact-review coverage-fact-review">
              <header><span>EDITORIAL-ONLY FACTS</span><b>{coverageApproved.length} selected</b></header>
              {coverageFacts.map((fact)=><div key={fact.id} className={!fact.selected?'ignored':''}>
                <button onClick={()=>updateCoverageFact(fact.id,{selected:!fact.selected})}>{fact.selected?<Check/>:<X/>}</button>
                <span><b>{fact.label || 'Coverage fact'}</b><small>{[fact.category,fact.team,fact.subject].filter(Boolean).join(' · ') || fact.evidence || fact.sourceName}</small></span>
                <em>{Math.round((Number(fact.confidence)||0)*100)}%</em>
                <input value={fact.value ?? ''} onChange={(event)=>updateCoverageFact(fact.id,{value:event.target.value,selected:true})}/>
              </div>)}
            </div>}

            <section className="official-feed-card official-upload-card">
              <RadioIcon/>
              <div>
                <span>EA SPORTS NETWORK · OPTIONAL</span>
                <h3>{officialSaved?'Official in-game coverage is attached to this week.':'Add the in-game EA Sports Network article.'}</h3>
                <p>Upload every screenshot page for the same EA SPORTS Network article at once, in reading order. DynastyHQ stitches the visible text into one recap, removes overlap, and preserves each original page.</p>
                {officialArticles.length>0 && <div className="official-article-list">{officialArticles.map((entry,index)=><small key={entry.headline+'-'+index}><Check/>{entry.headline || 'EA SPORTS Network article'} · {entry.pageCount || entry.sourcePages?.length || 1} PAGE{(entry.pageCount || entry.sourcePages?.length || 1)===1?'':'S'}</small>)}</div>}
                {officialProgress && <em className="official-upload-progress">{officialProgress}</em>}
                {officialError && <em className="official-upload-error">{officialError}</em>}
              </div>
              <div className="official-upload-actions">
                <b className={officialSaved?'saved':''}>{officialSaved?'ATTACHED':'OPTIONAL'}</b>
                <button type="button" disabled={officialScanning} onClick={()=>officialInputRef.current?.click()}><Upload/>{officialScanning?'SCANNING…':'UPLOAD EA ARTICLE'}</button>
                <input ref={officialInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>{scanOfficialArticleFiles(event.target.files);event.target.value=''}}/>
              </div>
            </section>

            <div className="coverage-boundary-note"><ShieldCheck/><span><b>Coverage-only boundary</b><small>Nothing reviewed here can overwrite the player line, team result, or career totals.</small></span></div>

            <div className="processing-actions">
              <button className="secondary" onClick={()=>setPhase('rtg')}><ChevronLeft/>RTG STATUS</button>
              {!coverageAdded && <button className="secondary" onClick={()=>{setCoverageSkipped(true);setPhase('ready')}}>SKIP OPTIONAL COVERAGE</button>}
              <button className="primary" disabled={coverageScanning || officialScanning || (!coverageAdded && !coverageSkipped && !officialSaved)} onClick={()=>setPhase('photos')}>{coverageAdded?'ACCEPT COVERAGE INTO PACKET':officialSaved?'CONTINUE WITH EA ARTICLE':'CONTINUE'}<ChevronRight/></button>
            </div>
          </section>}

          {phase==='photos' && <section className="processing-stage processing-photos">
            <div className="processing-stage-head">
              <span>STEP 5 · GAME PHOTOS</span>
              <h1>BUILD THIS WEEK'S PHOTO POOL.</h1>
              <p>Add up to 12 screenshots or game photos from this exact matchup. They stay tied to Season {data.season}, {weekDisplayLabel} and {game.opponent}, and DynastyHQ will prefer them automatically anywhere this week's imagery is needed.</p>
            </div>

            <div className="game-photo-boundary"><ShieldCheck/><span><b>STRICT WEEK BOUNDARY</b><small>These photos can auto-fill this week only. They cannot appear in another season or week unless you manually choose one for a specific article.</small></span></div>

            <div className="game-photo-upload-card">
              <Camera/>
              <div><span>{weekDisplayLabel} PHOTO POOL · OPTIONAL</span><h3>{gamePhotos.length ? `${gamePhotos.length} photo${gamePhotos.length===1?'':'s'} ready` : 'Add game photos for this matchup.'}</h3><p>Choose them now. Cloud upload happens only after your final Process Week confirmation.</p></div>
              <button type="button" disabled={gamePhotoUploading} onClick={()=>gamePhotoInputRef.current?.click()}><Upload/>{gamePhotos.length?'ADD MORE PHOTOS':'CHOOSE GAME PHOTOS'}</button>
              <input ref={gamePhotoInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>{addGamePhotos(event.target.files);event.target.value=''}}/>
            </div>

            {gamePhotos.length>0 && <div className="game-photo-grid">
              {gamePhotos.map((entry,index)=><article key={entry.id}>
                <img src={entry.url} alt={`Week ${game.week} game photo ${index+1}`}/>
                <span><b>{entry.name}</b><small>Season {data.season} · {weekDisplayLabel} · {game.opponent}</small></span>
                <button type="button" onClick={()=>removeGamePhoto(entry.id)} aria-label={`Remove ${entry.name}`}><X/></button>
              </article>)}
            </div>}

            {gamePhotoError && <div className="scanner-error scanner-inline"><Shield/><span>{gamePhotoError}</span></div>}
            {gamePhotoProgress && <div className="scanner-inline-status"><Upload/><span>{gamePhotoProgress}</span></div>}

            <div className="processing-actions">
              <button className="secondary" onClick={()=>setPhase('coverage')}><ChevronLeft/>COVERAGE</button>
              {!gamePhotos.length && <button className="secondary" onClick={()=>{setGamePhotosSkipped(true);setPhase('ready')}}>SKIP GAME PHOTOS</button>}
              <button className="primary" disabled={gamePhotoUploading} onClick={()=>setPhase('ready')}>{gamePhotos.length?'ACCEPT PHOTO POOL':'CONTINUE WITHOUT PHOTOS'}<ChevronRight/></button>
            </div>
          </section>}

          {phase==='ready' && <section className="processing-stage processing-ready">
            <div className="ready-check"><Check/></div>
            <span className="ready-kicker">STEP 6 · PROCESS WEEK</span>
            <h1>{weekDisplayLabel} IS READY.</h1>
            <p>{hasSavedGame && !selectedGameFacts.length
              ? 'The existing verified game and RTG data will stay untouched. Only the optional coverage or media you added will be attached when you confirm below.'
              : 'Your verified packet was built with the same Game Data, RTG Status and Coverage scanner services as the current site. Nothing is written until you confirm the save below.'}</p>

            <div className="ready-status-grid">
              <div className="done"><Upload/><span><small>GAME DATA</small><strong>{hasSavedGame && !selectedGameFacts.length?'SAVED GAME PRESERVED':selectedGameFacts.length+' FACTS REVIEWED'}</strong></span></div>
              <div className={rtgApproved.length?'done':'skipped'}><Sparkles/><span><small>RTG STATUS</small><strong>{rtgApproved.length?`${rtgApproved.length} FACTS READY`:(rtgSkipped?'NO CHANGES':'NOT SCANNED')}</strong></span></div>
              <div className={coverageAdded?'done':'skipped'}><Newspaper/><span><small>COVERAGE DATA</small><strong>{coverageAdded?`${coverageApproved.length} FACTS READY`:'OPTIONAL · SKIPPED'}</strong></span></div>
              <div className={officialSaved?'official':'skipped'}><Shield/><span><small>EA SPORTS NETWORK</small><strong>{officialSaved?'DETECTED':'NOT INCLUDED'}</strong></span></div>
              <div className={readyGamePhotoCount?'done':'skipped'}><Camera/><span><small>GAME PHOTOS</small><strong>{readyGamePhotoCount?`${readyGamePhotoCount} ${publishResult?'SAVED':'READY'}`:(gamePhotosSkipped?'OPTIONAL · SKIPPED':'NOT INCLUDED')}</strong></span></div>
            </div>

            <section className="ready-builds">
              <header><span>WHAT DYNASTYHQ WILL BUILD</span><b>FROM THIS VERIFIED PACKET</b></header>
              <div>
                <article><BarChart3/><span><b>Game Hub</b><small>Verified player + team game facts</small></span></article>
                <article><Newspaper/><span><b>Newsroom</b><small>Local, Regional and National coverage</small></span></article>
                <article><Headphones/><span><b>The Huddle</b><small>Transcript and NotebookLM source pack</small></span></article>
                <article><Archive/><span><b>Chronicle</b><small>Permanent {weekDisplayLabel} career chapter</small></span></article>
              </div>
            </section>

            {!publishResult && <div className="ready-warning"><LockKeyhole/><span><b>Live write is locked until confirmation</b><small>Scanning and review have not changed your career. Confirming below performs one archive-aware transaction, creates a pre-write checkpoint, and blocks stale or destructive saves.</small></span></div>}

            {publishError && <div className="publish-result-card error"><Shield/><span><b>WEEK NOT SAVED</b><small>{publishError}</small></span></div>}

            {publishResult && <div className="publish-result-card success"><Check/><span><b>{publishResult.action==='updated'?'VERIFIED WEEK UPDATED':'VERIFIED WEEK PUBLISHED'}</b><small>Season {data.season} · {weekDisplayLabel} · {publishResult.gameFactCount} game facts · {publishResult.rtgFactCount} RTG facts · {publishResult.coverageFactCount} coverage facts · {publishResult.gamePhotoCount || 0} game photos. A safety checkpoint was created before the write.</small></span></div>}

            {publishResult && coverageRefreshBusy && <div className="coverage-refresh-card busy"><Sparkles/><span><b>BUILDING POSTGAME COVERAGE</b><small>Writing the Newsroom edition and full Podcast transcript from the verified saved week. NotebookLM material updates with the transcript. Audio is not generated here.</small></span></div>}

            {publishResult && !coverageRefreshBusy && coverageRefreshResult && <div className={'coverage-refresh-card '+(coverageRefreshError?'warning':'success')}>
              {coverageRefreshError?<Shield/>:<Check/>}
              <span>
                <b>{coverageRefreshError?'WEEK SAVED · COVERAGE NEEDS ATTENTION':'POSTGAME COVERAGE READY'}</b>
                <small>Newsroom: {coverageRefreshResult.newsroom==='generated'?'generated':coverageRefreshResult.newsroom==='skipped'?'no new story needed':'not generated'} · Podcast transcript: {coverageRefreshResult.podcast==='generated'?'generated':'not generated'}.</small>
                {coverageRefreshError && <em>{coverageRefreshError}</em>}
              </span>
              {coverageRefreshError && <button disabled={coverageRefreshBusy} onClick={()=>refreshPublishedCoverage({
                targetPublicationId:publishResult.publicationId,
                targetSeason:Number(data.season)||1,
                targetWeek:Number(game.week)||0,
              })}><Sparkles/>RETRY COVERAGE</button>}
            </div>}

            {publishConfirm && !publishResult && <section className="publish-confirm-card">
              <ShieldCheck/>
              <div>
                <span>FINAL OWNER CONFIRMATION</span>
                <h3>{hasSavedGame && !selectedGameFacts.length?'Attach optional media to this saved week?':hasSavedGame?'Update this published week?':'Publish this verified week?'}</h3>
                <p>{hasSavedGame && !selectedGameFacts.length
                  ? 'DynastyHQ will preserve the existing verified game and RTG data for Season '+data.season+', Week '+game.week+' and attach only the optional EA SPORTS Network, Coverage, or Game Photo material you added.'
                  : hasSavedGame
                    ? 'DynastyHQ will update only the selected Season '+data.season+', Week '+game.week+' archive. After the protected save, the Newsroom edition and Podcast transcript/NotebookLM material will regenerate automatically from the corrected verified facts. Existing audio is never regenerated automatically.'
                    : 'DynastyHQ will publish Season '+data.season+', Week '+game.week+', advance the live career week, create the Game Log + Fact Ledger + Chronicle, save optional Coverage Data, then automatically write the Newsroom edition and Podcast transcript/NotebookLM material. Audio remains an explicit owner step.'}</p>
              </div>
              <div>
                <button className="secondary" disabled={publishing} onClick={()=>{setPublishConfirm(false);setPublishError('')}}>CANCEL</button>
                <button className="primary danger-confirm" disabled={publishing} onClick={publishVerifiedPacket}>{publishing?'SAVING VERIFIED WEEK…':hasSavedGame && !selectedGameFacts.length?'YES · ATTACH OPTIONAL MEDIA':hasSavedGame?'YES · UPDATE WEEK':'YES · PUBLISH WEEK'}</button>
              </div>
            </section>}

            <div className="processing-actions centered">
              {!publishResult && <button className="secondary" disabled={publishing} onClick={()=>{setPublishConfirm(false);setPublishError('');setPhase('coverage')}}><ChevronLeft/>BACK</button>}
              {publishResult
                ? <button className="primary ready-button" disabled={coverageRefreshBusy} onClick={closeSafe}>{coverageRefreshBusy?'BUILDING COVERAGE…':'CLOSE & VIEW SAVED WEEK'}<ChevronRight/></button>
                : <button className="primary ready-button" disabled={publishing} onClick={()=>{setPublishError('');setPublishConfirm(true)}}>{hasSavedGame && !selectedGameFacts.length?'ATTACH OPTIONAL MEDIA':hasSavedGame?'UPDATE VERIFIED WEEK':'PUBLISH VERIFIED WEEK'}<ChevronRight/></button>}
            </div>
          </section>}
        </main>
      </section>
    </div>
  </div>;
}

function PlusIcon(){
  return <span className="processing-plus">+</span>;
}

function RadioIcon(){
  return <RadioTower className="ea-broadcast-icon" aria-hidden="true"/>;
}

function PageVisualEditor({open,target,setTarget,visual,busy,onClose,onUpload,onReset,onMode,onPosition,onApplyAll}){
  if(!open) return null;
  const label=pages.find(([id])=>id===target)?.[1] || 'Page';
  const positions=[['30%','Left'],['50%','Center'],['70%','Right']];
  return <div className="visual-editor-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget) onClose()}}>
    <section className="visual-editor" role="dialog" aria-modal="true" aria-label="Page photo settings">
      <header>
        <div><span>PAGE APPEARANCE</span><h2>{label} photo</h2></div>
        <button onClick={onClose} aria-label="Close photo settings"><X/></button>
      </header>

      <div className="visual-editor-preview" style={{'--preview-photo':`url(${visual.image})`,'--photo-x':visual.position}}>
        <div/>
        <span>Gradient + blend stay automatic</span>
      </div>

      <label className="visual-page-select">Page
        <select value={target} onChange={(event)=>setTarget(event.target.value)}>
          {pages.map(([id,pageLabel])=><option key={id} value={id}>{pageLabel}</option>)}
        </select>
      </label>

      <div className="visual-source-row">
        <span>Photo source</span>
        <div>
          <button className={visual.mode==='auto'?'active':''} onClick={()=>onMode('auto')}><Sparkles/>Auto weekly photo</button>
          <button className={visual.mode==='manual'?'active':''} onClick={()=>onMode('manual')}><Camera/>Manual override</button>
        </div>
        <small className={visual.mode==='auto' && !visual.autoAvailable ? 'fallback' : ''}>
          {visual.mode==='auto'
            ? (visual.autoAvailable ? `Using ${visual.sourceLabel}` : 'No assigned game photo for this selected week; using the default until one exists.')
            : visual.sourceLabel}
        </small>
      </div>

      <div className="visual-position-row">
        <span>Photo focus</span>
        <div>{positions.map(([position,text])=><button key={position} className={visual.position===position?'active':''} onClick={()=>onPosition(position)}>{text}</button>)}</div>
      </div>

      <div className="visual-editor-actions">
        <label className="visual-upload"><Upload/>{busy?'Preparing…':'Choose photo'}<input type="file" accept="image/*" disabled={busy} onChange={(event)=>{const file=event.target.files?.[0];event.target.value='';onUpload(file)}}/></label>
        <button onClick={onReset}>Reset page</button>
        <button onClick={onApplyAll}>Use on all pages</button>
      </div>

      <p><ShieldCheck/>Saved only in this browser’s preview settings. It does not alter your DynastyHQ career data.</p>
    </section>
  </div>;
}

function ProfilePhotoEditor({open,name,visual,busy,onClose,onUpload,onReset,onPosition}){
  if(!open) return null;
  const positions=[['30%','Left'],['50%','Center'],['70%','Right']];
  return <div className="visual-editor-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget) onClose()}}>
    <section className="visual-editor profile-photo-editor" role="dialog" aria-modal="true" aria-label="Career profile photo settings">
      <header>
        <div><span>CAREER IDENTITY</span><h2>{name || 'Player'} profile photo</h2></div>
        <button onClick={onClose} aria-label="Close profile photo settings"><X/></button>
      </header>

      <div className="profile-photo-preview" style={{'--preview-photo':`url(${visual.image})`,'--photo-x':visual.position}}><div/></div>

      <p className="profile-photo-explainer">One profile photo follows this career across player-identity surfaces like Verified Game Data, the Newsroom Career File, and the Career page. Weekly article and hero photos stay separate.</p>

      <div className="visual-position-row">
        <span>Photo focus</span>
        <div>{positions.map(([position,text])=><button key={position} className={visual.position===position?'active':''} onClick={()=>onPosition(position)}>{text}</button>)}</div>
      </div>

      <div className="visual-editor-actions">
        <label className="visual-upload"><Upload/>{busy?'Preparing…':'Choose profile photo'}<input type="file" accept="image/*" disabled={busy} onChange={(event)=>{const file=event.target.files?.[0];event.target.value='';onUpload(file)}}/></label>
        <button onClick={onReset}>Reset profile photo</button>
      </div>

      <p><ShieldCheck/>Saved only in this browser’s redesign preview for this career. It does not change live career data yet.</p>
    </section>
  </div>;
}

function LiveDataBar({live,open,setOpen,email,setEmail,password,setPassword,onConnect}){
  const connected=live.status==='connected';
  return <section className={'live-data-bar '+(connected?'is-connected':'')}>
    <div className="live-data-status">
      <ShieldCheck/>
      <span><b>{connected?'REAL CAREER DATA · SAFE PREVIEW':'SAMPLE PREVIEW DATA'}</b><small>{connected?'The redesign reads your live career. Writes happen only after explicit owner actions: confirmed Week Processing, master-audio attachment, or career sharing.':'Connect your DynastyHQ account to populate this redesign from your real career without changing live data.'}</small></span>
    </div>
    {connected
      ? <button className="live-data-action" onClick={live.disconnect}>Disconnect</button>
      : <button className="live-data-action" onClick={()=>setOpen(v=>!v)}>{open?'Close':'Connect live career'}</button>}
    {open && !connected && <form className="live-auth-form" onSubmit={onConnect}>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
      <button className="yellow" disabled={live.status==='loading'}>{live.status==='loading'?'Connecting…':'Connect read-only'}</button>
      {live.error && <p>{live.error}</p>}
    </form>}
  </section>;
}

const HERO_HEADLINE_BANKS = {
  monster:[
    ['A NIGHT TO','REMEMBER'],
    ['ONE FOR','THE BOOKS'],
    ['WESSEL','UNLEASHED'],
    ['PUT ON','A SHOW'],
    ['ABSOLUTE','MASTERCLASS'],
    ['CAREER','DEFINING'],
    ['NO ANSWERS','FOR #6'],
    ['LIGHTS','TOO BRIGHT'],
    ['NUMBERS','DON’T LIE'],
    ['QB1','TAKES OVER'],
    ['ALL GAS','NO BRAKES'],
    ['THE SHOW','BELONGS TO #6'],
  ],
  dominant:[
    ['STATEMENT','MADE'],
    ['MESSAGE','SENT'],
    ['NO DOUBT','ABOUT IT'],
    ['CONTROL','FROM START'],
    ['GAME','OWNED'],
    ['ALL','OREGON'],
    ['FULL','COMMAND'],
    ['NEVER IN','DOUBT'],
    ['TOOK OVER','EARLY'],
    ['ROLLING','ALL NIGHT'],
    ['BUSINESS','HANDLED'],
    ['FROM KICK','TO FINISH'],
  ],
  closeWin:[
    ['SURVIVE &','ADVANCE'],
    ['FOUND A','WAY'],
    ['ESCAPE','SECURED'],
    ['DOWN TO','THE WIRE'],
    ['CLUTCH','WHEN IT COUNTED'],
    ['LATE','HEROICS'],
    ['ONE SCORE','ENOUGH'],
    ['HOLD ON','OREGON'],
    ['BREATHE','AGAIN'],
    ['FINISH','THE JOB'],
    ['FOURTH QUARTER','GRIT'],
    ['JUST','ENOUGH'],
  ],
  bigWin:[
    ['WESSEL','DELIVERS'],
    ['#6','SETS THE TONE'],
    ['THE OFFENSE','RUNS THROUGH #6'],
    ['ARM + LEGS','TOO MUCH'],
    ['WESSEL','LEADS THE WAY'],
    ['QB1','IN COMMAND'],
    ['THE DRIVER’S','SEAT'],
    ['WESSEL','AT THE CENTER'],
    ['OFFENSE','ON HIS SHOULDERS'],
    ['#6','MAKES IT GO'],
    ['WESSEL','SETS THE PACE'],
    ['THE ENGINE','IS #6'],
  ],
  win:[
    ['JOB','DONE'],
    ['WIN','SECURED'],
    ['TAKE CARE','OF BUSINESS'],
    ['ONWARD','OREGON'],
    ['ONE MORE','IN THE BOOKS'],
    ['MISSION','COMPLETE'],
    ['HANDLE IT','MOVE ON'],
    ['ANOTHER','STEP FORWARD'],
    ['KEEP IT','ROLLING'],
    ['SATURDAY','SECURED'],
    ['GOOD TEAMS','FIND A WAY'],
    ['THE RESULT','THAT MATTERS'],
  ],
  closeLoss:[
    ['HEARTBREAK','LATE'],
    ['ONE PLAY','SHORT'],
    ['SLIPPED','AWAY'],
    ['SO CLOSE','SO TOUGH'],
    ['PAIN AT','THE FINISH'],
    ['DOWN TO','THE LAST'],
    ['FOUR QUARTERS','NOT ENOUGH'],
    ['A TOUGH','ONE TO SWALLOW'],
    ['RIGHT THERE','AT THE END'],
    ['THE EDGE','WAS THIN'],
    ['JUST OUT','OF REACH'],
    ['LAST DRIVE','HEARTBREAK'],
  ],
  bigLoss:[
    ['BIG NIGHT','TOUGH END'],
    ['NUMBERS','WITHOUT THE WIN'],
    ['BRIGHT SPOTS','BITTER END'],
    ['EFFORT','UNREWARDED'],
    ['STATS','CAN’T SAVE IT'],
    ['WESSEL','KEEPS FIGHTING'],
    ['OFFENSE','SHOWS LIFE'],
    ['THE FIGHT','WAS THERE'],
    ['GOOD NIGHT','BAD RESULT'],
    ['PRODUCTION','WITHOUT PAYOFF'],
    ['#6','KEEPS PUSHING'],
    ['PLENTY THERE','EXCEPT THE WIN'],
  ],
  loss:[
    ['BACK TO','WORK'],
    ['RESET','REQUIRED'],
    ['LESSONS','LEARNED'],
    ['TOUGH','SATURDAY'],
    ['ANSWER','NEXT WEEK'],
    ['REGROUP','RELOAD'],
    ['TURN THE','PAGE'],
    ['NOT OUR','NIGHT'],
    ['TIME TO','RESPOND'],
    ['NEXT ONE','MATTERS'],
    ['TAKE IT','LEARN FROM IT'],
    ['THE RESPONSE','STARTS NOW'],
  ],
};

const stableHeroHash=(value)=>{
  let hash=2166136261;
  for(const char of String(value||'')){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return Math.abs(hash>>>0);
};

const heroRawScores=(game={})=>{
  if(game.teamScore!==undefined && game.teamScore!=='' && game.opponentScore!==undefined && game.opponentScore!==''){
    return {us:Number(game.teamScore)||0,them:Number(game.opponentScore)||0};
  }
  const home=Number(game.homeScore);
  const away=Number(game.awayScore);
  if(!Number.isFinite(home)||!Number.isFinite(away)) return {us:0,them:0};
  return String(game.homeAway||'').toLowerCase()==='away' ? {us:away,them:home} : {us:home,them:away};
};

const heroCategoryForGame=(game={})=>{
  const scores=heroRawScores(game);
  const result=String(game.result||'').toUpperCase();
  const won=result==='W' || scores.us>scores.them;
  const lost=result==='L' || scores.us<scores.them;
  const margin=Math.abs(scores.us-scores.them);
  const total=(Number(game.passYds)||0)+(Number(game.rushYds)||0);
  const touchdowns=(Number(game.passTD)||0)+(Number(game.rushTD)||0);

  if(won && (touchdowns>=5 || total>=400)) return 'monster';
  if(won && margin>=17) return 'dominant';
  if(won && margin<=7) return 'closeWin';
  if(won && total>=300) return 'bigWin';
  if(won) return 'win';
  if(lost && margin<=7) return 'closeLoss';
  if(lost && total>=350) return 'bigLoss';
  return 'loss';
};

const uniqueHeroHeadlineForGame=(data,currentGame)=>{
  const season=Number(data.season)||1;
  const currentWeek=Number(currentGame?.week ?? data.game?.week ?? 0);
  const currentOpponent=String(currentGame?.opponent || data.game?.opponent || 'OPPONENT').toUpperCase();

  const completed=(data.state?.gameLogs || [])
    .filter((game)=>(
      game
      && game.didPlay!==false
      && game.stage!=='high-school'
      && !game.evaluation
      && Number(game.season||season)===season
      && String(game.opponent||'').trim()
    ))
    .sort((a,b)=>(Number(a.week)||0)-(Number(b.week)||0));

  const used=new Set();
  let selected=null;

  for(const raw of completed){
    const category=heroCategoryForGame(raw);
    const bank=HERO_HEADLINE_BANKS[category] || HERO_HEADLINE_BANKS.win;
    const rawWeek=Number(raw.week)||0;
    const opponent=String(raw.opponent||'OPPONENT').toUpperCase();
    const startIndex=stableHeroHash(`${season}|${rawWeek}|${opponent}|${category}`) % bank.length;
    let candidate=null;

    for(let offset=0;offset<bank.length;offset+=1){
      const base=bank[(startIndex+offset)%bank.length];
      const key=`${base[0]}|${base[1]}`;
      if(!used.has(key)){
        candidate=base;
        break;
      }
    }

    // A full category bank should be rare in one season. This fallback stays
    // unique because it uses the actual opponent rather than repeating a slogan.
    if(!candidate){
      const won=heroCategoryForGame(raw).includes('Win') || ['monster','dominant','bigWin','win'].includes(category);
      candidate=won ? ['PAST',opponent] : ['NEXT AFTER',opponent];
    }

    used.add(`${candidate[0]}|${candidate[1]}`);
    if(rawWeek===currentWeek && opponent===currentOpponent) selected=candidate;
  }

  if(selected) return selected;

  const category=heroCategoryForGame(currentGame || {});
  const bank=HERO_HEADLINE_BANKS[category] || HERO_HEADLINE_BANKS.win;
  const index=stableHeroHash(`${season}|${currentWeek}|${currentOpponent}|${category}`) % bank.length;
  return bank[index];
};

function homeHeroStory(data){
  const game=data.game || {};
  const opponent=game.opponent || 'NEXT OPPONENT';
  const hasGame=Boolean(data.selection?.hasGame);

  if(!hasGame){
    const pregameOptions=[
      ['NEXT UP',opponent],
      ['THE NEXT','TEST'],
      ['EYES ON',opponent],
      [data.weekLabel || ('W'+game.week),'ON DECK'],
      ['GAME WEEK',opponent],
      ['THE ROAD','CONTINUES'],
      ['READY FOR',opponent],
      ['UP NEXT',opponent],
    ];
    const pick=pregameOptions[stableHeroHash(`${data.season}|${game.week}|${opponent}|pregame`) % pregameOptions.length];
    return {
      state:'pregame',
      status:data.selection?.isCurrent?'UPCOMING':'SCHEDULED',
      line1:pick[0],
      line2:pick[1],
      deck:`${data.weekLabel || `Week ${game.week}`} is still ahead. The page will flip to its postgame story after the result is uploaded and archived.`,
    };
  }

  const [line1,line2]=uniqueHeroHeadlineForGame(data,game.raw || game);
  return {state:'postgame',status:'FINAL',line1,line2};
}

const selectedWeekTarget=(data)=>{
  const state=data?.state || {};
  const season=Number(data?.season || state.currentSeason || 1) || 1;
  const week=Number(data?.week ?? data?.game?.week ?? state.currentWeek ?? 0) || 0;
  const seasonSchedule=(state.seasonSchedules || []).find((entry)=>Number(entry?.season || 1)===season) || {};
  const entries=Array.isArray(seasonSchedule.entries)
    ? seasonSchedule.entries
    : (Array.isArray(seasonSchedule.games) ? seasonSchedule.games : (Array.isArray(seasonSchedule.schedule) ? seasonSchedule.schedule : []));
  const scheduled=entries.find((entry)=>Number(entry?.week)===week) || null;
  const opponent=String(scheduled?.opponent || data?.game?.opponent || '').trim();
  const isBye=scheduled ? Boolean(scheduled.isBye) : /^bye(?:\s+week)?$/i.test(opponent);
  return {
    season,
    week,
    isBye,
    displayLabel:String(data?.weekLabel || scheduleDisplayLabel(scheduled || {week}) || `W${week}`).trim(),
    opponent:String(opponent || (isBye?'BYE':'NEXT OPPONENT')).toUpperCase(),
  };
};

const liveCareerTarget=(data)=>{
  const state=data?.state || {};
  const season=Number(state.currentSeason || data?.season || 1) || 1;
  const week=Number(state.currentWeek ?? data?.week ?? 0) || 0;
  const setup=state.currentWeekSetup || {};
  const seasonSchedule=(state.seasonSchedules || []).find((entry)=>Number(entry?.season || 1)===season) || {};
  const entries=Array.isArray(seasonSchedule.entries)
    ? seasonSchedule.entries
    : (Array.isArray(seasonSchedule.games) ? seasonSchedule.games : (Array.isArray(seasonSchedule.schedule) ? seasonSchedule.schedule : []));
  const scheduled=entries.find((entry)=>Number(entry?.week)===week) || null;
  // The season schedule is the authoritative source for the active week.
  // currentWeekSetup can lag behind after schedule/week updates, so only
  // fall back to it when no schedule row exists for the live week.
  const isBye=scheduled ? Boolean(scheduled.isBye) : Boolean(setup.isBye);
  const selectedIsLive=Number(data?.season)===season && Number(data?.week)===week;
  const fallbackOpponent=selectedIsLive
    ? data?.game?.opponent
    : (Number(data?.next?.week)===week ? data?.next?.opponent : '');
  return {
    season,
    week,
    isBye,
    displayLabel:scheduleDisplayLabel(scheduled || {week,label:setup.label || setup.customLabel || ''}),
    opponent:String(scheduled?.opponent || setup.opponent || fallbackOpponent || (isBye?'BYE':'NEXT OPPONENT')).toUpperCase(),
  };
};

function ScoreRibbon({data}){
  const game=data.game;
  const liveTarget=liveCareerTarget(data);
  const pregame=!data.selection?.hasGame;
  // A chosen week can match the live schedule even if an archive-selection
  // flag is stale. Match stable season/week keys before rendering a redundant
  // second current-game teaser on small screens.
  const showingLiveWeek=Number(data.season)===Number(liveTarget.season)
    && Number(data.week)===Number(liveTarget.week);
  return <div className={'score-ribbon '+(pregame?'pregame-ribbon ':'')+(showingLiveWeek?'live-selected':'archived-selected')}>
    <div><span>{data.weekLabel || `W${game.week}`}</span><b>{pregame?(data.selection?.isCurrent?'UPCOMING':'SCHEDULED'):'FINAL'}</b></div>
    {pregame ? <>
      <div className="score-team pregame-team"><Logo team={data.player.school}/><span>{data.player.school}</span></div>
      <span className="matchup-vs">VS</span>
      <div className="score-team away pregame-team"><Logo team={game.opponent}/><span>{game.opponent}</span></div>
    </> : <>
      <div className="score-team"><Logo team={data.player.school}/><span>{data.player.school}</span><strong>{game.us}</strong></div>
      <span className="dash">–</span>
      <div className="score-team away"><strong>{game.them}</strong><Logo team={game.opponent}/><span>{game.opponent}</span></div>
    </>}
    <div className="score-sep"/>
    <div className="upnext"><b>LIVE CAREER</b><span>{liveTarget.displayLabel}</span>{!liveTarget.isBye&&<Logo team={liveTarget.opponent}/>}<strong>{liveTarget.isBye?'BYE':liveTarget.opponent}</strong></div>
  </div>;
}

const liveCareerNextGame=(data)=>nextCareerMatchupForHome(data);

function HomePage({data,visual,podcastEpisodeCover,go,openArticle,openOfficialArticle,openPodcast,openArchiveMoment,notify,schedulePanel}){
  const story=homeHeroStory(data);
  const pregame=story.state==='pregame';
  const liveNextGame=liveCareerNextGame(data);
  const selectedIsLive=Number(data?.season)===Number(liveNextGame.season) && Number(data?.week)===Number(liveNextGame.week);
  const matchup=liveNextGame;
  const seasonTD=(Number(data.totals?.passTD)||0)+(Number(data.totals?.rushTD)||0);
  const officialStories=Array.isArray(data.news?.officialArticles)?data.news.officialArticles:[];
  const latestOfficial=officialStories[0] || null;
  return <div className={'page home-page '+(pregame?'pregame-home':'postgame-home')}>
    <section className="hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${visual.image})`,'--photo-x':visual.position}}>
      <div className="hero-overlay"/>
      <div className="hero-copy">
        <span className="eyebrow">{data.weekLabel || `WEEK ${data.game.week}`} <i/> {story.status}</span>
        <h1 className={pregame?'pregame-headline':''}><span>{story.line1}</span><em>{story.line2}</em></h1>

        {pregame ? <div className="hero-score pregame-score">
          <div className="hero-score-team home-team"><Logo team={data.player.school}/><small>{data.player.school}</small></div>
          <span className="hero-final">VS</span>
          <div className="hero-score-team away-team"><Logo team={data.game.opponent}/><small>{data.game.opponent}</small></div>
        </div> : <div className="hero-score">
          <div className="hero-score-team home-team"><Logo team={data.player.school}/><strong>{data.game.us}</strong><small>{data.player.school}</small></div>
          <span className="hero-final">FINAL</span>
          <div className="hero-score-team away-team"><strong>{data.game.them}</strong><Logo team={data.game.opponent}/><small>{data.game.opponent}</small></div>
        </div>}

        <div className="hero-stats">
          {pregame ? <>
            <div><strong>{(Number(data.totals?.passYds)||0).toLocaleString()}</strong><span>SEASON PASS YDS</span></div>
            <div><strong>{(Number(data.totals?.rushYds)||0).toLocaleString()}</strong><span>SEASON RUSH YDS</span></div>
            <div><strong>{seasonTD}</strong><span>SEASON TOTAL TD</span></div>
          </> : <>
            <div><strong>{data.game.pass}</strong><span>PASS YDS</span></div>
            <div><strong>{data.game.rush}</strong><span>RUSH YDS</span></div>
            <div><strong>{data.game.td}</strong><span>TOTAL TD</span></div>
          </>}
        </div>

        <div className="hero-actions">
          {pregame ? <>
            <button className="yellow" onClick={()=>openArchiveMoment(data.season,data.game.week,'gamehub')}><CalendarDays/>Open {data.weekLabel || `Week ${data.game.week}`} Hub<ChevronRight/></button>
            <button className="outline" onClick={()=>go('career')}><TrendingUp/>View season progress</button>
          </> : <>
            <button className="yellow" onClick={()=>openArticle(data.news?.article?.id || '')}><CalendarDays/>Open game recap<ChevronRight/></button>
            <button className="outline" onClick={()=>go('gamehub')}><BarChart3/>View verified stats</button>
          </>}
        </div>
      </div>
      <div className="player-standin" aria-hidden="true">
        <div className="helmet"><Logo team={data.player.school}/></div>
        <div className="jersey">{data.player.number}</div>
        <div className="arm left"/>
        <div className="arm right"/>
      </div>
    </section>

    <section className="home-cards">
      <article className="dark-card next-week reference-next-week">
        <CardHeader title="YOUR NEXT GAME"/>
        <div className="next-body">
          <Logo team={matchup.opponent} type="big"/>
          <div><small>{matchup.displayLabel || `W${matchup.week}`}</small><h3>{matchup.opponent}</h3></div>
        </div>
        <p>{matchup.awaiting
          ? 'Your latest game is complete. The next opponent has not been confirmed in the schedule yet.'
          : selectedIsLive && pregame
            ? 'This is the active matchup. Play the game, then upload the result to turn this page into the postgame story.'
            : 'This is the next unplayed game in your live career, even while you browse older weeks.'}</p>
        <button className="yellow" onClick={()=>matchup.awaiting?go('gamehub'):openArchiveMoment(matchup.season,matchup.week,'gamehub')}><CalendarDays/>{matchup.awaiting?'VIEW THE ROAD AHEAD':selectedIsLive && pregame?'OPEN THIS GAME':'PREPARE NEXT GAME'}<ChevronRight/></button>
      </article>

      <article className="dark-card wrap-card reference-wrap">
        <CardHeader title={pregame?`${data.weekLabel || `WEEK ${data.game.week}`} GAME PLAN`:`${data.weekLabel || `WEEK ${data.game.week}`} WRAP-UP`}/>
        {pregame ? <>
          <CheckRow title="Matchup ready" sub={`${data.player.school} vs. ${data.game.opponent}`}/>
          <CheckRow title="Game data waiting" sub="Stats unlock after the game is uploaded" pending/>
          <CheckRow title="Coverage after final" sub="Newsroom and Huddle generate from the completed week" pending/>
        </> : <>
          <CheckRow title="Game stats reviewed" sub="Player and team performance updated"/>
          <CheckRow title="Coverage ready" sub="Article, media, and highlights available"/>
          <CheckRow title="Career updated" sub="Progress, milestones, and records tracked"/>
        </>}
        <button className="outline full" onClick={()=>go('gamehub')}><BarChart3/>Open Game Hub<ChevronRight/></button>
      </article>

      <article className="paper-card newsroom-card reference-newsroom-card">
        <CardHeader title={pregame?'POSTGAME COVERAGE':'FROM THE NEWSROOM'} light/>
        <div className="news-flex">
          <div><h3>{pregame?`${data.weekLabel || `WEEK ${data.game.week}`} COVERAGE AWAITS`:data.news.headline}</h3><p>{pregame?'The Newsroom story and Huddle episode will populate after this game is completed and archived.':data.news.dek}</p></div>
          <div className="thumb photo-tile" style={{backgroundImage:`url(${visual.image})`,backgroundPosition:`${visual.position} 29%`}}/>
        </div>
        {!pregame && latestOfficial && <button className="home-official-coverage home-official-feature" onClick={openOfficialArticle}>
          <div className="home-official-feature-head">
            <RadioIcon/>
            <div><b>EA SPORTS NETWORK</b><small>OFFICIAL NATIONAL COVERAGE</small></div>
            <em>OFFICIAL</em>
          </div>
          <strong className="home-official-headline">{latestOfficial.headline || 'Official in-game coverage'}</strong>
          <p className="home-official-dek">{latestOfficial.dek || latestOfficial.summary || 'Open the original EA SPORTS Network coverage captured from this week.'}</p>
          <div className="home-official-cta">OPEN ORIGINAL STORY<ChevronRight/></div>
        </button>}
        <button className={'pod-mini '+(pregame?'pending-media':'')} onClick={()=>pregame?notify('The Huddle will unlock after this week is completed.'):openPodcast('episode')}>
          <img src={podcastEpisodeCover || podcastCover} alt="The Huddle"/>
          <span className="pod-copy"><b>THE HUDDLE</b><small>{pregame?'Episode generates after the final':data.podcast.title}</small><em>{pregame?'WAITING':data.podcast.duration}</em></span>
          <span className="pod-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
          <span className="pod-play">{pregame?<LockKeyhole/>:<Play/>}</span>
        </button>
      </article>
    </section>

    {schedulePanel}

    <section className="journey-strip">
      <div><b>YOUR JOURNEY</b><small>One career. Every chapter.</small></div>
      <div className="stage active"><span className="journey-helmet" aria-hidden="true"></span><b>Player</b><small>Build your legacy<br/>as a college star</small></div>
      <div className="stage"><Headphones/><b>Coordinator</b><small>Future Mode</small></div>
      <div className="stage"><Trophy/><b>Head coach</b><small>Future Mode</small></div>
    </section>
  </div>;
}


function CardHeader({title,light=false}){ return <div className={'card-title '+(light?'light':'')}><b>{title}</b><ChevronRight size={17}/></div>; }
function CheckRow({title,sub,pending=false}){ return <div className={'check-row '+(pending?'pending':'')}><span>{pending?<CalendarDays/>:<Check/>}</span><div><b>{title}</b><small>{sub}</small></div></div>; }

function GameHub({data,visual,profileVisual,openProfilePhoto,go,openOfficialArticle,openPodcast,openProcessing,onRegenerateCoverage,statsTab,setStatsTab,notify,schedulePanel}){
  const [detailOpen,setDetailOpen]=useState('');
  const showStat=(value)=>value===null||value===undefined||value===''?'—':String(value);
  const pregame=!data.selection?.hasGame;
  const team=data.game.team || {};
  const scoring=data.game.scoring || {};
  const viewedWeek=selectedWeekTarget(data);
  const viewedIsCurrent=Boolean(data.selection?.isCurrent);
  const verifiedFacts=data.podcast?.sourceFacts || [];
  const officialStories=Array.isArray(data.news?.officialArticles)?data.news.officialArticles:[];
  const latestOfficial=officialStories[0] || null;
  const rtg=data.rtg || {};
  const developmentFacts=verifiedFacts.filter((fact)=>/rtg\.|overall|development|coach trust|skill point|energy|gpa|wear/i.test(`${fact?.key||''} ${fact?.label||''}`));
  const copyPrepChecklist=async()=>{
    const checklist=[
      'DynastyHQ Week '+viewedWeek.week+' vs '+viewedWeek.opponent,
      'CORE POSTGAME: Final score',
      'CORE POSTGAME: Player stats',
      'CORE POSTGAME: Team stats',
      'OPTIONAL: Scoring summary',
      'OPTIONAL: RTG Overview / Academics / Leadership / Health / Fitness / Brand if changed',
      'OPTIONAL COVERAGE: teammate/opponent Player Stats, Team Stats, scoring context',
    ].join('\n');
    try{
      await navigator.clipboard.writeText(checklist);
      notify('Week '+viewedWeek.week+' capture checklist copied.');
    }catch{
      notify('Your browser could not copy the prep checklist.');
    }
  };
  const rtgRows=[
    ['Overall',data.player.overall],
    ['Depth chart',rtg.rank],
    ['Coach trust',rtg.coachTrust],
    ['Trust to next rank',rtg.trustToNext],
    ['Skill points',rtg.skillPoints],
    ['Energy',rtg.energy],
    ['GPA',rtg.gpa],
    ['Followers',rtg.followers],
    ['NIL valuation',rtg.valuation],
  ].filter(([,value])=>value!==undefined&&value!==null&&value!=='');
  const wearRows=Object.entries(rtg.wear || {}).map(([key,value])=>[`${key.charAt(0).toUpperCase()}${key.slice(1)} wear`,value]);
  const statContent = statsTab==='player'
    ? [[showStat(data.game.pass),'PASSING YARDS'],[showStat(data.game.rush),'RUSHING YARDS'],[showStat(data.game.total),'TOTAL YARDS'],[showStat(data.game.td),'TOTAL TD']]
    : statsTab==='team'
      ? [[showStat(team.points),'POINTS'],[showStat(team.totalYards),'TOTAL OFFENSE'],[showStat(team.firstDowns),'FIRST DOWNS'],[showStat(team.turnovers),'TURNOVERS']]
      : [[showStat(scoring.playCount),'SCORING PLAYS'],[showStat(scoring.passTD),'PASS TD'],[showStat(scoring.rushTD),'RUSH TD'],[showStat(scoring.opponentPoints),'OPP PTS']];
  return <div className="page gamehub-page">
    <section className="hub-hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${visual.image})`,'--photo-x':visual.position}}>
      <div><h1>GAME <em>HUB</em></h1><p>{data.weekLabel || `W${data.game.week}`} / {data.game.opponent} / {pregame?'PREGAME':'POSTGAME'}</p></div>
      <button className="yellow import" onClick={openProcessing}>{pregame?<Upload/>:<Pencil/>}{pregame?`PROCESS ${data.weekLabel || `W${data.game.week}`}`:`REVIEW / UPDATE ${data.weekLabel || `W${data.game.week}`}`}</button>
    </section>

    <section className={'complete-strip '+(pregame?'pregame-strip':'')}>
      <div><h2>{pregame?`${data.weekLabel || `W${data.game.week}`} AWAITS`:`${data.weekLabel || `W${data.game.week}`} COMPLETE`}</h2><p>{pregame?`No final game data is saved yet for ${data.player.school} vs. ${data.game.opponent}.`:`All items belong to Season ${data.season} • ${data.weekLabel || `W${data.game.week}`}`}</p></div>
      <div className="flow">{['Import','Review','Coverage','Archive'].map((x,index)=><React.Fragment key={x}><span className={'flow-step '+(pregame?'pending':'')}><i>{pregame?(index===0?<Upload/>:<span>{index+1}</span>):<Check/>}</i>{x}</span>{x!=='Archive'&&<b/>}</React.Fragment>)}</div>
    </section>

    <section className="hub-grid">
      <div className="left-stack">
        <article className="paper-panel verified reference-verified">
          <div className="panel-head"><h2 className="verified-title"><span className="desktop-label">{pregame?'WEEK GAME DATA':'VERIFIED GAME DATA'}</span><span className="mobile-label">{pregame?'PREGAME':'PLAYER STATS'}</span></h2>
            <div className="tabs">
              <button className={statsTab==='team'?'active':''} onClick={()=>setStatsTab('team')}>Team stats</button>
              <button className={statsTab==='player'?'active':''} onClick={()=>setStatsTab('player')}>Player stats</button>
              <button className={statsTab==='drives'?'active':''} onClick={()=>setStatsTab('drives')}>Scoring drives</button>
            </div>
          </div>

          <div className="player-summary">
            <div className="player-photo">
              <div className="fake-player photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,24,18,.10),rgba(0,24,18,.05)),url(${profileVisual.image})`,backgroundPosition:`${profileVisual.position} 29%`}}/>
              <button className="profile-photo-change" onClick={openProfilePhoto} aria-label="Change career profile photo" title="Change career profile photo"><Camera/></button>
            </div>
            <div className="player-copy"><div className="player-name"><Logo team={data.player.school}/><div><h3>{data.player.name}</h3><p>#{data.player.number} &nbsp; | &nbsp; {data.player.pos} &nbsp; | &nbsp; {data.player.school}</p></div></div>
              <div className="stat-grid">{statContent.map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="ghost" onClick={()=>setDetailOpen('sources')}><ShieldCheck/>VIEW VERIFIED SOURCES</button>
            <button className="ghost" onClick={openProcessing}><Pencil/>REVIEW WEEK DATA</button>
          </div>
        </article>

        <article className="paper-panel material reference-material">
          <h2>GAME MATERIAL</h2>
          <div className="material-grid">
            <Material icon={FileText} title="Box score" sub={pregame?'Available after the final.':'Game statistics and team totals attached.'} ready={!pregame} onClick={()=>pregame?notify('The box score will unlock after this game is completed.'):setDetailOpen('box')}/>
            <Material icon={ClipboardList} title="Scoring summary" sub={pregame?'Available after the final.':'All scoring drives attached to this game.'} ready={!pregame} onClick={()=>pregame?notify('Scoring drives will unlock after this game is completed.'):setStatsTab('drives')}/>
            <Material icon={UserRound} title="Player ratings" sub={pregame?'Available after the final.':'Current saved RTG/player status.'} ready={!pregame} onClick={()=>pregame?notify('Player ratings will unlock after this game is completed.'):setDetailOpen('ratings')}/>
          </div>
        </article>
      </div>

      <div className="right-stack">
        <article className="paper-panel coverage reference-coverage">
          <h2>WEEKLY COVERAGE</h2>
          <CoverageRow icon={Newspaper} title="Newsroom edition" sub={pregame?'Generates after the completed week.':'Game recap and analysis.'} status={pregame?'WAITING':'READY'} onClick={()=>pregame?notify('Newsroom coverage will unlock after the game.'):go('newsroom')}/>
          <CoverageRow icon={Mic2} title="Podcast transcript" sub={pregame?'Generates after the completed week.':'Full episode transcript.'} status={pregame?'WAITING':'READY'} onClick={()=>pregame?notify('Podcast coverage will unlock after the game.'):openPodcast('transcript')}/>
          <CoverageRow icon={BookOpen} title="NotebookLM pack" sub={pregame?'Generates after the completed week.':'Game files and key moments.'} status={pregame?'WAITING':'READY'} onClick={()=>pregame?notify('NotebookLM material will unlock after the game.'):openPodcast('notebook')}/>
          {!pregame && latestOfficial && <CoverageRow icon={RadioIcon} title="EA SPORTS Network" sub={latestOfficial.headline || 'Official in-game coverage attached.'} status="READY" onClick={openOfficialArticle}/>}
          <button className="yellow full" onClick={()=>pregame?notify('Coverage opens after the final is processed.'):go('newsroom')}><Zap/>{pregame?'COVERAGE AFTER GAME':'OPEN COVERAGE'}<ChevronRight/></button>
          {!pregame && <button type="button" className="ghost full hub-regenerate-coverage" onClick={onRegenerateCoverage}><Sparkles/>REGENERATE NEWS + PODCAST<ChevronRight/></button>}
        </article>

        <article className="paper-panel development reference-development">
          <h2>PLAYER DEVELOPMENT</h2>
          <SimpleRow icon={BarChart3} title="Attribute changes" sub={developmentFacts.length?developmentFacts.length+' verified development references saved.':'Open current saved player-development status.'} onClick={()=>setDetailOpen('development')}/>
          <SimpleRow icon={UserRound} title="Coach trust" sub={rtg.coachTrust!==undefined?'Saved trust: '+rtg.coachTrust+(rtg.trustToNext!==undefined?' / '+rtg.trustToNext:''):'Open current depth-chart status.'} onClick={()=>setDetailOpen('ratings')}/>
          <SimpleRow icon={ClipboardList} title="Training status" sub={rtg.skillPoints!==undefined?'Skill points available: '+rtg.skillPoints:'Review current energy, wear and saved RTG values.'} onClick={()=>setDetailOpen('training')}/>
          <button className="ghost full" onClick={()=>setDetailOpen('development')}><BarChart3/>REVIEW DEVELOPMENT<ChevronRight/></button>
        </article>
      </div>
    </section>

    <section className="hub-bottom">
      <div><b>{viewedIsCurrent?'THIS WEEK':'VIEWING'}</b><span>• {viewedWeek.displayLabel || `W${viewedWeek.week}`}</span>{!viewedWeek.isBye&&<Logo team={viewedWeek.opponent}/>}<strong>{viewedWeek.isBye?'BYE':viewedWeek.opponent}</strong></div>
      <button className="yellow" onClick={()=>viewedWeek.isBye?notify(`${viewedWeek.displayLabel || `W${viewedWeek.week}`} is a bye in the selected schedule week.`):setDetailOpen('prep')}><CalendarDays/>{viewedWeek.isBye?`${viewedIsCurrent?'CURRENT':'VIEWING'} · ${viewedWeek.displayLabel || `W${viewedWeek.week}`} BYE`:`PREPARE · ${viewedWeek.displayLabel || `W${viewedWeek.week}`}`}<ChevronRight/></button>
      <div className="future"><Archive/><span><b>DYNASTY WORKSPACE</b><small>Recruiting · Depth chart · Staff</small></span><em>COMING SOON</em></div>
    </section>

    {schedulePanel}

    {detailOpen && <div className="game-detail-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setDetailOpen('')}}>
      <section className="game-detail-modal" role="dialog" aria-modal="true" aria-label="Game Hub details">
        <header>
          <div><span>SEASON {data.season} · WEEK {detailOpen==='prep'?viewedWeek.week:data.game.week}</span><h2>{detailOpen==='prep'?'Week Prep':detailOpen==='sources'?'Verified Sources':detailOpen==='box'?'Box Score':detailOpen==='ratings'?'Player Status':detailOpen==='training'?'Training Status':'Player Development'}</h2></div>
          <button onClick={()=>setDetailOpen('')} aria-label="Close details"><X/></button>
        </header>

        {detailOpen==='prep' && <div className="game-detail-body week-prep-detail">
          <section className="week-prep-matchup">
            <div><small>{viewedIsCurrent?'LIVE CAREER MATCHUP':'SELECTED MATCHUP'}</small><b>{viewedWeek.displayLabel || `W${viewedWeek.week}`}</b></div>
            <Logo team={data.player.school}/>
            <strong>{data.player.school}</strong>
            <em>VS</em>
            <Logo team={viewedWeek.opponent}/>
            <strong>{viewedWeek.opponent}</strong>
          </section>
          <section><h3>CURRENT PLAYER CHECK</h3><div className="game-detail-grid">
            {[
              ['Overall',data.player.overall],
              ['Role',rtg.rank || rtg.role || '—'],
              ['Coach trust',rtg.coachTrust ?? rtg.trust ?? '—'],
              ['Skill points',rtg.skillPoints ?? '—'],
            ].map(([label,value])=><div key={label}><span>{label}</span><b>{showStat(value)}</b></div>)}
          </div></section>
          <section><h3>POSTGAME CAPTURE CHECKLIST</h3><div className="week-prep-checklist">
            <div><Check/><span><b>Final score</b><small>Core · one clear final/game summary screen</small></span></div>
            <div><Check/><span><b>Player stats</b><small>Core · your verified individual line</small></span></div>
            <div><Check/><span><b>Team stats</b><small>Core · team context and totals</small></span></div>
            <div><PlusIcon/><span><b>Scoring summary</b><small>Optional · improves game-flow coverage</small></span></div>
            <div><PlusIcon/><span><b>RTG status screens</b><small>Optional · upload only the areas that changed</small></span></div>
            <div><PlusIcon/><span><b>Coverage screens</b><small>Optional · teammates, opponent and editorial context</small></span></div>
          </div></section>
          <div className="week-prep-note"><ShieldCheck/><span><b>Play first. Upload after the final.</b><small>Week Processing remains locked behind your final review and confirmation. This prep view does not write anything.</small></span><button onClick={copyPrepChecklist}><Copy/>COPY CHECKLIST</button></div>
        </div>}

        {detailOpen==='box' && <div className="game-detail-body">
          <section><h3>{data.player.name}</h3><div className="game-detail-grid">
            {[
              ['Passing yards',data.game.pass],['Passing TD',data.game.passTD],['Rushing yards',data.game.rush],['Rushing TD',data.game.rushTD],
              ['Total yards',data.game.total],['Total TD',data.game.td],['Interceptions',data.game.interceptions],
            ].map(([label,value])=><div key={label}><span>{label}</span><b>{showStat(value)}</b></div>)}
          </div></section>
          <section><h3>{data.player.school} TEAM</h3><div className="game-detail-grid">
            {[
              ['Points',team.points],['Total offense',team.totalYards],['Passing yards',team.passYards],['Rushing yards',team.rushYards],
              ['First downs',team.firstDowns],['Turnovers',team.turnovers],['Opponent yards',team.opponentTotalYards],['Opponent turnovers',team.opponentTurnovers],
            ].map(([label,value])=><div key={label}><span>{label}</span><b>{showStat(value)}</b></div>)}
          </div></section>
        </div>}

        {detailOpen==='sources' && <div className="game-detail-body">
          <p className="game-detail-intro">These are the verified Fact Ledger entries attached to this selected publication. Evidence text is shown when it was preserved with the fact.</p>
          <div className="verified-source-list">
            {verifiedFacts.length ? verifiedFacts.map((fact,index)=><article key={fact.id||fact.key||index}>
              <ShieldCheck/>
              <div><span>{fact.label || fact.key || 'Verified fact'}</span><b>{String(fact.value ?? fact.displayValue ?? fact.text ?? 'Verified')}</b>{(fact.evidence||fact.sourceName||fact.sourceType) && <small>{fact.evidence || fact.sourceName || fact.sourceType}</small>}</div>
            </article>) : <div className="game-detail-empty">No verified Fact Ledger entries are attached to this selected week.</div>}
          </div>
        </div>}

        {(detailOpen==='ratings'||detailOpen==='training'||detailOpen==='development') && <div className="game-detail-body">
          <section><h3>CURRENT SAVED RTG STATUS</h3><div className="game-detail-grid">
            {(detailOpen==='training' ? [...rtgRows.filter(([label])=>['Skill points','Energy','GPA'].includes(label)),...wearRows] : rtgRows).map(([label,value])=><div key={label}><span>{label}</span><b>{showStat(value)}</b></div>)}
          </div></section>
          {detailOpen==='development' && <section><h3>VERIFIED DEVELOPMENT REFERENCES</h3><div className="verified-source-list">
            {developmentFacts.length ? developmentFacts.map((fact,index)=><article key={fact.id||fact.key||index}><BarChart3/><div><span>{fact.label || fact.key || 'Development fact'}</span><b>{String(fact.value ?? fact.displayValue ?? fact.text ?? 'Saved')}</b>{fact.evidence && <small>{fact.evidence}</small>}</div></article>) : <div className="game-detail-empty">No separate development facts were saved for this week. The current RTG status above is still live career data.</div>}
          </div></section>}
        </div>}

        <footer><button onClick={()=>setDetailOpen('')}>CLOSE</button></footer>
      </section>
    </div>}
  </div>;
}

function Material({icon:Icon,title,sub,onClick,ready=true}){ return <button className={'material-card '+(!ready?'pending':'')} onClick={onClick}><Icon/><div><b>{title}</b><small>{sub}</small></div><span>{ready?<Check/>:<LockKeyhole/>}</span><ChevronRight/></button>; }
function CoverageRow({icon:Icon,title,sub,onClick,status='READY'}){ return <button className={'coverage-row '+(status==='READY'?'':'pending')} onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><em>{status}</em><ChevronRight/></button>; }
function SimpleRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row simple" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><ChevronRight/></button>; }

function PodcastPage({
  data,
  visual,
  showCover,
  episodeCover,
  localPodcastArtwork,
  podcastCoverForPublication,
  podcastArtBusy,
  onUploadShowCover,
  onResetShowCover,
  onUploadEpisodeCover,
  onUseShowCover,
  go,
  openArchiveMoment,
  playing,
  setPlaying,
  podcastTab,
  setPodcastTab,
  notify,
  onRegenerateCoverage,
}){
  const episode=data.podcast || {};
  const archiveRef=useRef(null);
  const [showAllEpisodes,setShowAllEpisodes]=useState(false);
  const [masterMessage,setMasterMessage]=useState('');
  const [masterMessageType,setMasterMessageType]=useState('success');
  const [audioUrl,setAudioUrl]=useState('');
  const [audioLoading,setAudioLoading]=useState(false);
  const [audioCurrentTime,setAudioCurrentTime]=useState(0);
  const [audioDuration,setAudioDuration]=useState(0);
  const [masterBusy,setMasterBusy]=useState(false);
  const [studioOpen,setStudioOpen]=useState(false);
  const studioAnchorRef=useRef(null);
  const audioRef=useRef(null);
  const masterInputRef=useRef(null);
  const showCoverInputRef=useRef(null);
  const episodeCoverInputRef=useRef(null);
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  const transcript = episode.segments?.length
    ? episode.segments.map((segment,index)=>[segment.speaker || `HOST ${index+1}`,segment.text])
    : [
      ['EPISODE BRIEF',episode.summary || 'This week does not have a generated podcast transcript yet.'],
      ['GAME CONTEXT',`${data.player.school} ${game.us}–${game.them} ${game.opponent}. ${game.pass} passing yards, ${game.rush} rushing yards, ${game.td} total touchdowns.`],
    ];
  const chapters=episode.chapters?.length
    ? episode.chapters.slice(0,8)
    : [
      {title:'Opening Drive',summary:`The Week ${game.week} result and why it mattered.`},
      {title:`${lastName}’s Night`,summary:`${game.pass} passing, ${game.rush} rushing, ${game.td} total touchdowns.`},
      {title:'What Comes Next',summary:`The Week ${data.next.week} setup against ${data.next.opponent}.`},
    ];
  const facts=episode.sourceFacts || [];
  const notebookFacts=notebookUniqueFacts(facts.filter((fact)=>!notebookIsRtgFact(fact)));
  const scoringFacts=notebookUniqueFacts(notebookFacts.filter((fact)=>(
    notebookIsScoringFact(fact)
    && !notebookIsCanonicalStatDuplicate(fact,data)
  )));
  const notebookContextFacts=notebookUniqueFacts(notebookFacts.filter((fact)=>(
    !notebookIsCanonicalStatDuplicate(fact,data)
    && !notebookIsScoringFact(fact)
  )));
  const latestNotebookSelection=latestNotebookGameSelection(data.state || {});
  const latestNotebookData=latestNotebookSelection
    ? derivePreviewData(data.state,{
      season:latestNotebookSelection.season,
      week:latestNotebookSelection.week,
    })
    : null;
  const selectedHasCompletedGame=Boolean(game.raw && game.opponent && game.opponent!=='NO GAME');
  const notebookTargetData=selectedHasCompletedGame ? data : (latestNotebookData || data);
  const notebookTargetEpisode=notebookTargetData.podcast || episode;
  const notebookTargetFacts=notebookTargetEpisode.sourceFacts || [];
  const notebookTargetGame=notebookTargetData.game || {};
  const notebookProducerPack=buildNotebookLmProducerPack({
    data:notebookTargetData,
    episode:notebookTargetEpisode,
    facts:notebookTargetFacts,
  });
  const notebookPack=notebookProducerPack.text;
  const latestNotebookPack=latestNotebookData
    ? buildNotebookLmProducerPack({
      data:latestNotebookData,
      episode:latestNotebookData.podcast || {},
      facts:latestNotebookData.podcast?.sourceFacts || [],
    })
    : null;
  const notebookUsesLatestFallback=(
    Number(notebookTargetData.season)!==Number(data.season)
    || Number(notebookTargetGame.week)!==Number(game.week)
  );
  const latestNotebookIsDifferent=Boolean(latestNotebookPack && (
    Number(latestNotebookPack.meta.season)!==Number(notebookProducerPack.meta.season)
    || Number(latestNotebookPack.meta.week)!==Number(notebookProducerPack.meta.week)
  ));
  const downloadNotebookPack=()=>downloadPreviewText(
    notebookPack,
    notebookProducerPack.meta.suggestedFileName,
  );
  const downloadLatestNotebookPack=()=>{
    if(!latestNotebookPack) return notify('No completed uploaded game is available for a NotebookLM Producer Pack yet.');
    downloadPreviewText(latestNotebookPack.text,latestNotebookPack.meta.suggestedFileName);
  };
  const copyNotebookCustomizePrompt=async()=>{
    try{
      await navigator.clipboard.writeText(notebookProducerPack.customizePrompt);
      notify('NotebookLM Customize prompt copied.');
    }catch{
      notify('Your browser could not copy the NotebookLM prompt. The same prompt is included at the bottom of the downloaded Producer Pack.');
    }
  };
  const downloadTranscript=()=>downloadPreviewText(episode.transcript || transcript.map(([title,body])=>title+'\n'+body).join('\n\n'),'DynastyHQ-S'+data.season+'-W'+game.week+'-Podcast-Transcript.txt');
  const isNotebookMaster=episode.audioEngine==='notebooklm-master-upload';
  const actualAudioDurationSeconds=Number(audioDuration || episode.masterAudioDurationSeconds)||0;
  const featuredDuration=episode.audioReady && actualAudioDurationSeconds>0 ? formatPreviewClock(actualAudioDurationSeconds) : (episode.duration || '—');
  const hasTranscript=Boolean(episode.segments?.length);
  const masterFileName=episode.masterAudioFileName || '';
  const masterSize=episode.masterAudioSizeBytes ? `${(episode.masterAudioSizeBytes/1024/1024).toFixed(1)} MB` : '';
  const rawEpisode=episode.episode || null;
  const publicationId=episode.publicationId || previewPublicationIdFor(rawEpisode);
  const episodeId=rawEpisode?.id || (publicationId ? `podcast-${publicationId}` : '');
  const ownerUser=auth.currentUser;
  const prior=episode.previous || [];
  const archiveEpisodes=episode.archive?.length ? episode.archive : prior;
  const localEpisodeArtwork=localPodcastArtwork?.episodes?.[publicationId] || {};
  const showCoverIsPreviewOverride=Boolean(localPodcastArtwork?.show?.image);
  const episodeCoverIsPreviewOverride=Boolean(localEpisodeArtwork.image);
  const episodeUsesShowCover=Boolean(localEpisodeArtwork.useShowCover)
    || (!episodeCoverIsPreviewOverride && !episode.episodeCoverUrl);
  const showCoverStatus=showCoverIsPreviewOverride
    ? 'Preview override'
    : (episode.showCoverUrl ? 'Saved DynastyHQ cover' : 'Built-in default');
  const episodeCoverStatus=episodeCoverIsPreviewOverride
    ? 'Custom episode override'
    : (episodeUsesShowCover ? 'Using default show cover' : 'Saved episode cover');
  const scrollArchive=(direction)=>{
    archiveRef.current?.scrollBy({left:direction*Math.max(280,archiveRef.current.clientWidth*.78),behavior:'smooth'});
  };
  const playEpisode=()=> {
    if(!episode.audioReady){
      notify('This saved episode does not currently have ready audio attached. The transcript and source data are still available.');
      return;
    }
    if(audioLoading){
      notify('DynastyHQ is loading this episode audio now.');
      return;
    }
    if(!audioUrl || !audioRef.current){
      notify('The saved episode is marked ready, but its audio file could not be loaded.');
      return;
    }
    if(!audioRef.current.paused){
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    audioRef.current.play()
      .then(()=>setPlaying(true))
      .catch(()=>notify('Your browser could not start this episode audio.'));
  };
  const jumpToTab=(tab)=>{
    setPodcastTab(tab);
    setStudioOpen(false);
    setTimeout(()=>document.querySelector('.podcast-workspace')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
  };
  const openChapter=(chapter,index)=>{
    setPodcastTab('transcript');
    setStudioOpen(false);
    const chapterId=String(chapter?.id || '');
    window.setTimeout(()=>{
      const sections=[...document.querySelectorAll('.transcript-paper [data-podcast-chapter]')];
      const target=(chapterId ? sections.find((node)=>node.getAttribute('data-podcast-chapter')===chapterId) : null)
        || sections[Math.max(0,Number(chapter?.segmentStart)||index||0)]
        || document.querySelector('.transcript-paper');
      target?.scrollIntoView({behavior:'smooth',block:'center'});
    },90);
  };
  const closeStudio=()=>{
    setStudioOpen(false);
    window.requestAnimationFrame(()=>studioAnchorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  const seekEpisode=(nextValue)=>{
    const audio=audioRef.current;
    if(!audio || !Number.isFinite(Number(nextValue))) return;
    const next=Math.max(0,Math.min(Number(nextValue),Number(audio.duration)||0));
    audio.currentTime=next;
    setAudioCurrentTime(next);
  };

  useEffect(()=>{
    let cancelled=false;
    let objectUrl='';
    audioRef.current?.pause();
    setPlaying(false);
    setAudioUrl('');
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setMasterMessage('');

    if(!episode.audioReady || !episodeId || !ownerUser?.uid){
      setAudioLoading(false);
      return undefined;
    }

    const loadSavedAudio=async()=>{
      setAudioLoading(true);
      try{
        let segments=await loadPodcastAudioLocal(episodeId);
        if(!segments?.length){
          segments=await loadPodcastAudioCloud({
            db,
            appId:productionAppId,
            userId:ownerUser.uid,
            episodeId,
          });
        }
        if(cancelled) return;
        if(!segments?.length){
          setMasterMessageType('error');
          setMasterMessage('The episode is marked ready, but its saved audio chunks could not be found.');
          return;
        }
        objectUrl=URL.createObjectURL(podcastAudioBlob(segments));
        setAudioUrl(objectUrl);
      }catch(error){
        if(cancelled) return;
        setMasterMessageType('error');
        setMasterMessage(error?.message || 'The saved episode audio could not be loaded.');
      }finally{
        if(!cancelled) setAudioLoading(false);
      }
    };

    loadSavedAudio();
    return ()=>{
      cancelled=true;
      audioRef.current?.pause();
      if(objectUrl) URL.revokeObjectURL(objectUrl);
    };
  },[episode.audioReady,episode.masterAudioUploadedAt,episodeId,ownerUser?.uid,setPlaying]);

  const patchMasterEpisode=async(patch)=>{
    const user=auth.currentUser;
    if(!user || !db) throw new Error('Sign in to your DynastyHQ account before attaching master audio.');
    if(user.isAnonymous) throw new Error('Use your normal DynastyHQ account before attaching master audio.');
    if(!publicationId) throw new Error('DynastyHQ could not identify the selected podcast week.');

    return runTransaction(db,async(transaction)=>{
      const loaded=await readHydratedCareerInTransaction({
        transaction,
        db,
        appId:productionAppId,
        userId:user.uid,
      });
      if(!loaded) throw new Error('Your DynastyHQ career could not be loaded.');

      const episodesNow=loaded.state.podcastEpisodes || [];
      const currentEpisode=episodesNow.find((entry)=>previewPublicationIdFor(entry)===publicationId);
      if(!currentEpisode) throw new Error('Create this week’s transcript before attaching master audio.');

      const patchedEpisode={...currentEpisode,...patch};
      const revision=(Number(loaded.rawMain?._sync?.revision) || 0)+1;
      const nextState={
        ...loaded.state,
        podcastEpisodes:episodesNow.map((entry)=>previewPublicationIdFor(entry)===publicationId ? patchedEpisode : entry),
        _sync:{revision,deviceId:PREVIEW_MASTER_AUDIO_DEVICE_ID,updatedAt:new Date().toISOString()},
      };

      writeHydratedCareerInTransaction({
        transaction,
        db,
        appId:productionAppId,
        userId:user.uid,
        state:nextState,
      });
      return patchedEpisode;
    });
  };

  const uploadMasterAudio=async(file)=>{
    if(!file || masterBusy) return;
    if(!rawEpisode || !hasTranscript){
      notify('Generate this week’s transcript before attaching master audio.');
      return;
    }
    if(!previewAudioFileAllowed(file)){
      setMasterMessageType('error');
      setMasterMessage('Choose an MP3, M4A, WAV, AAC, or OGG audio file.');
      return;
    }
    if(file.size>PREVIEW_MASTER_AUDIO_MAX_BYTES){
      setMasterMessageType('error');
      setMasterMessage('That file is over 30 MB. Export a smaller MP3/M4A version and try again.');
      return;
    }

    const user=auth.currentUser;
    if(!user || user.isAnonymous){
      setMasterMessageType('error');
      setMasterMessage('Sign in with your normal DynastyHQ account before attaching master audio.');
      return;
    }

    const previousStatus=rawEpisode.audioStatus || 'not-generated';
    const previousEngine=rawEpisode.audioEngine || '';
    const previousModel=rawEpisode.audioModel || '';
    const targetEpisodeId=rawEpisode.id || ('podcast-'+publicationId);
    setMasterBusy(true);
    setMasterMessageType('success');
    setMasterMessage('Preparing NotebookLM master audio…');

    try{
      await patchMasterEpisode({audioStatus:'uploading-master'});
      const masterAudioDurationSeconds=await previewAudioDurationForFile(file);
      const dataBase64=await previewFileToBase64(file);
      const mimeType=previewAudioMimeFor(file);
      const piece={
        index:0,
        data:dataBase64,
        mimeType,
        hostId:'',
        continuous:true,
        source:'notebooklm',
      };

      setMasterMessage('Saving the master episode to DynastyHQ…');
      await savePodcastAudioLocal(targetEpisodeId,[piece]);
      await savePodcastAudioCloud({
        db,
        appId:productionAppId,
        userId:user.uid,
        episodeId:targetEpisodeId,
        segments:[piece],
      });

      const savedAt=new Date().toISOString();
      await patchMasterEpisode({
        status:'published',
        audioStatus:'ready',
        audioModel:'notebooklm-audio-overview',
        audioEngine:'notebooklm-master-upload',
        audioSource:'notebooklm',
        audioContinuous:true,
        audioSegmentCount:1,
        audioGeneratedAt:savedAt,
        audioTranscriptFingerprint:'',
        masterAudioFileName:file.name || 'NotebookLM Audio Overview',
        masterAudioMimeType:mimeType,
        masterAudioSizeBytes:file.size,
        masterAudioDurationSeconds:masterAudioDurationSeconds>0?Math.round(masterAudioDurationSeconds):0,
        masterAudioUploadedAt:savedAt,
      });

      setMasterMessageType('success');
      setMasterMessage('Master audio attached to Season '+data.season+', Week '+game.week+'.');
      notify('NotebookLM master audio attached.');
    }catch(error){
      try{
        await patchMasterEpisode({
          audioStatus:previousStatus,
          audioEngine:previousEngine,
          audioModel:previousModel,
        });
      }catch{
        // Preserve the useful upload error below even if status recovery fails.
      }
      setMasterMessageType('error');
      setMasterMessage(error?.message || 'The NotebookLM audio could not be attached.');
    }finally{
      setMasterBusy(false);
    }
  };

  return <div className="page podcast-page podcast-page-v2">
    <section className="pod-show-shell" style={{'--page-photo':`url(${visual.image})`,'--photo-x':visual.position}}>
      <div ref={studioAnchorRef} className="pod-network-bar">
        <span><Mic2/>DYNASTYHQ SPORTS NETWORK</span>
        <div className="pod-network-actions">
          <b>{episode.audioReady?'EPISODE READY':'SCRIPT + SOURCE PACK READY'}</b>
          {data.selection?.hasGame && <button type="button" className="pod-regenerate-coverage" onClick={onRegenerateCoverage}><Sparkles/>REGENERATE</button>}
          <button type="button" className={studioOpen?'active':''} onClick={()=>studioOpen?closeStudio():setStudioOpen(true)} aria-expanded={studioOpen}>
            <LockKeyhole/>STUDIO<ChevronDown/>
          </button>
        </div>
      </div>

      <section className={'pod-owner-drawer '+(studioOpen?'open':'')} aria-hidden={!studioOpen}>
        <div className="pod-studio-title">
          <span><LockKeyhole/>OWNER STUDIO</span>
          <button type="button" className="pod-owner-close" onClick={closeStudio} aria-label="Close owner studio"><X/></button>
        </div>

        <div className="pod-artwork-controls">
          <div className="pod-artwork-heading">
            <span><ImageIcon/>PODCAST ARTWORK</span>
            <small>Show default + optional weekly override</small>
          </div>

          <div className="pod-artwork-grid">
            <article className="pod-artwork-card">
              <img src={showCover || podcastCover} alt="Default show cover"/>
              <div>
                <small>DEFAULT SHOW COVER</small>
                <b>The Huddle</b>
                <em>{showCoverStatus}</em>
              </div>
              <button type="button" disabled={Boolean(podcastArtBusy)} onClick={()=>showCoverInputRef.current?.click()}>
                <Camera/>{podcastArtBusy==='show'?'PREPARING…':showCoverIsPreviewOverride?'REPLACE':'CHOOSE COVER'}
              </button>
              {(showCoverIsPreviewOverride || episode.showCoverUrl) && <button type="button" className="pod-artwork-secondary" disabled={Boolean(podcastArtBusy)} onClick={onResetShowCover}>RESET</button>}
              <input
                ref={showCoverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event)=>{
                  const file=event.target.files?.[0];
                  event.target.value='';
                  if(file) onUploadShowCover(file);
                }}
              />
            </article>

            <article className="pod-artwork-card">
              <img src={episodeCover || showCover || podcastCover} alt="Episode cover"/>
              <div>
                <small>WEEK {game.week} EPISODE COVER</small>
                <b>{episode.title || ('Week '+game.week+' Recap')}</b>
                <em>{episodeCoverStatus}</em>
              </div>
              <button type="button" disabled={Boolean(podcastArtBusy)} onClick={()=>episodeCoverInputRef.current?.click()}>
                <ImageIcon/>{podcastArtBusy==='episode'?'PREPARING…':episodeCoverIsPreviewOverride?'REPLACE OVERRIDE':'ADD OVERRIDE'}
              </button>
              <button type="button" className="pod-artwork-secondary" disabled={Boolean(podcastArtBusy) || episodeUsesShowCover} onClick={onUseShowCover}>USE SHOW COVER</button>
              <input
                ref={episodeCoverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event)=>{
                  const file=event.target.files?.[0];
                  event.target.value='';
                  if(file) onUploadEpisodeCover(file);
                }}
              />
            </article>
          </div>
        </div>

        <div className="pod-master-status">
          <div className={isNotebookMaster?'ready':''}><Headphones/></div>
          <span>
            <small>MASTER EPISODE AUDIO</small>
            <b>{isNotebookMaster?'NotebookLM master attached':episode.audioReady?'Saved episode audio attached':'No master audio attached'}</b>
            <em>{masterFileName ? `${masterFileName}${masterSize?` · ${masterSize}`:''}` : (hasTranscript?'Ready for final audio':'Generate transcript first')}</em>
          </span>
        </div>
        <div className="pod-studio-actions">
          <button onClick={downloadNotebookPack}><FileText/>DOWNLOAD PRODUCER PACK</button>
          <button
            className={isNotebookMaster?'replace-master':'attach-master'}
            disabled={masterBusy}
            onClick={()=>hasTranscript ? masterInputRef.current?.click() : notify('Generate this week’s transcript before attaching master audio.')}
          >
            <Upload/>{masterBusy?'ATTACHING…':hasTranscript?(isNotebookMaster?'REPLACE MASTER AUDIO':'ATTACH MASTER AUDIO'):'GENERATE TRANSCRIPT FIRST'}
          </button>
          <input
            ref={masterInputRef}
            className="pod-master-file-input"
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg"
            onChange={(event)=>{
              const file=event.target.files?.[0];
              event.target.value='';
              if(file) uploadMasterAudio(file);
            }}
          />
        </div>
        {masterMessage && <p className="pod-studio-message" data-type={masterMessageType}>{masterMessage}</p>}
        <p className="pod-owner-note">MP3 · M4A · WAV · AAC · OGG · up to 30 MB. Audio attaches only to Season {data.season}, Week {game.week} when you choose a file.</p>
      </section>

      <div className="pod-show-overview">
        <div className="pod-show-cover">
          <img src={showCover || podcastCover} alt="The Huddle podcast cover"/>
          <button className="pod-show-cover-change" type="button" onClick={()=>showCoverInputRef.current?.click()} disabled={Boolean(podcastArtBusy)} title="Change default show cover" aria-label="Change default show cover"><Camera/><span>CHANGE COVER</span></button>
        </div>
        <div className="pod-show-identity">
          <span className="pod-show-category">COLLEGE FOOTBALL PODCAST</span>
          <h1>THE HUDDLE</h1>
          <p>Postgame reaction, verified game context, player development and the story of the season — built from the selected DynastyHQ week.</p>
          <div className="pod-show-meta">
            <span>Season {data.season}</span><i/>
            <span>Week {game.week}</span><i/>
            <span>{data.player.school}</span>
          </div>
          <div className="pod-show-links">
            <button onClick={()=>jumpToTab('episode')}><Headphones/>Latest episode</button>
            <button onClick={()=>jumpToTab('transcript')}><FileText/>Transcript</button>
            <button onClick={()=>jumpToTab('notebook')}><Zap/>NotebookLM</button>
          </div>
        </div>
      </div>

      <section className="pod-embed-card">
        <div className="pod-embed-art">
          <img src={episodeCover || showCover || podcastCover} alt=""/>
        </div>
        <div className="pod-embed-info">
          <span>FEATURED EPISODE · {data.weekLabel || `W${game.week}`}</span>
          <h2>{episode.title || `${data.weekLabel || `W${game.week}`} Recap`}</h2>
          <p>{episode.summary || `Game breakdown and verified career context from ${data.player.school} vs. ${game.opponent}.`}</p>
          <div className="pod-embed-meta">
            <b>{featuredDuration}</b><span>•</span><span>Season {data.season}</span><span>•</span><span>{data.player.school} vs. {game.opponent}</span>
          </div>
        </div>
        <button className="pod-embed-play" onClick={playEpisode} aria-label={playing?'Pause episode':'Play episode'}>
          {playing?<span className="pause-bars"><i/><i/></span>:<Play/>}
        </button>
        <div className="pod-embed-progress">
          <div className="pod-embed-wave" aria-hidden="true">{Array.from({length:42}).map((_,i)=><i key={i}/>)}</div>
          {episode.audioReady && <input
            className="pod-audio-scrubber"
            type="range"
            min="0"
            max={Math.max(0,audioDuration||0)}
            step="0.1"
            value={Math.min(audioCurrentTime,audioDuration||0)}
            disabled={!audioUrl || !audioDuration}
            onChange={(event)=>seekEpisode(event.target.value)}
            aria-label="Podcast playback position"
          />}
          <div>
            <span>{episode.audioReady?(audioLoading?'LOADING':playing?'PLAYING':'AUDIO READY'):'SCRIPT ONLY'}</span>
            <b>{episode.audioReady && actualAudioDurationSeconds ? `${formatPreviewClock(audioCurrentTime)} / ${formatPreviewClock(actualAudioDurationSeconds)}` : featuredDuration}</b>
          </div>
        </div>
        {audioUrl && <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={()=>setPlaying(true)}
          onPause={()=>setPlaying(false)}
          onEnded={()=>{setPlaying(false);setAudioCurrentTime(audioDuration)}}
          onLoadedMetadata={(event)=>setAudioDuration(Number(event.currentTarget.duration)||0)}
          onDurationChange={(event)=>setAudioDuration(Number(event.currentTarget.duration)||0)}
          onTimeUpdate={(event)=>setAudioCurrentTime(Number(event.currentTarget.currentTime)||0)}
          hidden
        />}
      </section>

      <div className="pod-game-ribbon">
        <div><small>FINAL</small><strong>{data.player.school} {game.us}–{game.them} {game.opponent}</strong></div>
        <div><small>{lastName}</small><strong>{game.total} TOTAL YARDS</strong></div>
        <div><small>TOUCHDOWNS</small><strong>{game.td} TOTAL TD</strong></div>
        <button onClick={()=>go('gamehub')}>VIEW GAME DATA<ChevronRight/></button>
      </div>
    </section>

    <section className="podcast-workspace pod-workspace-v2">
      <div className="podcast-tabs">
        <button className={podcastTab==='episode'?'active':''} onClick={()=>setPodcastTab('episode')}>Episode</button>
        <button className={podcastTab==='transcript'?'active':''} onClick={()=>setPodcastTab('transcript')}>Transcript</button>
        <button className={podcastTab==='notebook'?'active':''} onClick={()=>setPodcastTab('notebook')}>NotebookLM</button>
      </div>

      {podcastTab==='episode' && <div className="pod-episode-layout-v2">
        <article className="pod-episode-main">
          <span className="section-kicker">EPISODE BREAKDOWN</span>
          <h2>{episode.title || `${data.weekLabel || `W${game.week}`} postgame show`}</h2>
          <p className="pod-episode-summary">{episode.summary || 'The episode uses the saved verified game packet and career context for this week.'}</p>

          <div className="pod-chapter-list">
            {chapters.map((chapter,index)=><button key={chapter.id||chapter.title||index} onClick={()=>openChapter(chapter,index)}>
              <span className="pod-chapter-time">{String(index+1).padStart(2,'0')}</span>
              <span className="pod-chapter-copy"><strong>{chapter.title || `Chapter ${index+1}`}</strong><small>{chapter.summary || 'Saved episode chapter.'}</small></span>
              <ChevronRight/>
            </button>)}
          </div>
        </article>

        <aside className="pod-episode-rail-v2">
          <section className="pod-about-show">
            <span>ABOUT THE SHOW</span>
            <div className="pod-about-heading"><img src={showCover || podcastCover} alt=""/><div><b>The Huddle</b><small>DynastyHQ Sports Network</small></div></div>
            <p>Weekly college-football coverage built around your Road to Glory career, with game reaction, verified stats and season context.</p>
          </section>

          <section className="pod-episode-facts">
            <span>THIS EPISODE</span>
            <div><Check/><b>{facts.length}</b><small>verified source facts</small></div>
            <div><Check/><b>{episode.segments?.length || 0}</b><small>transcript segments</small></div>
            <div><Check/><b>{scoringFacts.length}</b><small>unique scoring references</small></div>
            <div><Check/><b>{notebookContextFacts.length}</b><small>unique supporting facts</small></div>
          </section>

          <section className="pod-owner-shortcut">
            <LockKeyhole/>
            <span><b>OWNER TOOLS</b><small>Audio, NotebookLM and artwork live in the Studio menu at the top of the Podcast page.</small></span>
            <button onClick={()=>{setStudioOpen(true);window.scrollTo({top:0,behavior:'smooth'})}}>OPEN STUDIO<ChevronRight/></button>
          </section>

          <section className="pod-related-v2">
            <span>RELATED</span>
            <button onClick={()=>go('newsroom')}><Newspaper/><b>Read the game story</b><ChevronRight/></button>
            <button onClick={()=>go('gamehub')}><BarChart3/><b>Open Game Hub</b><ChevronRight/></button>
          </section>
        </aside>
      </div>}

      {podcastTab==='transcript' && <div className="transcript-layout">
        <article className="transcript-paper">
          <div className="transcript-head">
            <div><span>THE HUDDLE • SAVED TRANSCRIPT</span><h2>{episode.title || `${data.weekLabel || `W${game.week}`} Recap`}</h2><p>Season {data.season} • {data.weekLabel || `W${game.week}`} • {data.player.school} {game.us}, {game.opponent} {game.them}</p></div>
            <div className="transcript-head-actions"><button className="ghost" onClick={downloadTranscript}><FileText/>DOWNLOAD TRANSCRIPT</button><button className="ghost" onClick={()=>window.print()}><FileText/>PRINT TRANSCRIPT</button></div>
          </div>
          {episode.segments?.length
            ? episode.segments.map((segment,index)=><section key={segment.id||index} data-podcast-chapter={segment.chapterId||''}><h3>{segment.speaker || `HOST ${index+1}`}</h3><p>{segment.text}</p></section>)
            : transcript.map(([title,body],index)=><section key={`${title}-${index}`} data-podcast-chapter=""><h3>{title}</h3><p>{body}</p></section>)}
          <div className="transcript-note">{episode.segments?.length ? 'This is the complete saved DynastyHQ transcript for the selected real career week.' : 'No generated transcript is saved for this week yet; only verified game context is shown.'}</div>
        </article>
        <aside className="transcript-sidebar">
          <span>GAME REFERENCES</span>
          <div><small>Passing</small><b>{game.pass} YDS • {game.passTD} TD</b></div>
          <div><small>Rushing</small><b>{game.rush} YDS • {game.rushTD} TD</b></div>
          <div><small>Total offense</small><b>{game.total} YDS</b></div>
          <div><small>Final score</small><b>{data.player.school} {game.us} • {game.opponent} {game.them}</b></div>
          <button onClick={()=>go('gamehub')}>VERIFY IN GAME HUB<ChevronRight/></button>
        </aside>
      </div>}

      {podcastTab==='notebook' && <div className="notebook-layout">
        <article className="notebook-card">
          <div className="notebook-icon"><Zap/></div>
          <span className="section-kicker">NOTEBOOKLM PRODUCER PACK 2.0</span>
          <h2>Week {notebookProducerPack.meta.week} • {notebookProducerPack.meta.opponent}</h2>
          <p>A producer-first research packet built for NotebookLM Deep Dive audio: story hierarchy first, then verified football detail, recent context and the full DynastyHQ transcript.</p>

          <div className="notebook-target-banner">
            <span>EXPORT TARGET</span>
            <b>Season {notebookProducerPack.meta.season} · Week {notebookProducerPack.meta.week} · {notebookProducerPack.meta.opponent}</b>
            <small>{notebookUsesLatestFallback
              ? 'You are viewing a week without a completed saved game, so DynastyHQ automatically targets the latest uploaded game.'
              : latestNotebookIsDifferent
                ? 'This export follows the selected archive week. The latest uploaded-game pack is also available below.'
                : 'Latest completed uploaded game.'}</small>
          </div>

          <div className="source-list">
            <div><Check/><span><b>Producer brief + story hierarchy</b><small>{notebookProducerPack.meta.storylineCount} verified/current-week angles tell NotebookLM what deserves the most discussion.</small></span></div>
            <div><Check/><span><b>Canonical game + team comparison</b><small>Result, tracked-player core line and team/opponent stats are presented once instead of repeated in several forms.</small></span></div>
            <div><Check/><span><b>Scoring timeline / drives</b><small>{notebookProducerPack.meta.scoringCount} de-duplicated scoring references are kept as football chronology.</small></span></div>
            <div><Check/><span><b>Complete uploaded screenshot stats</b><small>{notebookProducerPack.meta.screenshotStatCount || notebookProducerPack.meta.supportingFactCount} published screenshot stats are preserved and organized into passing, rushing, receiving, defense, kicking, punting, returns and other verified data.</small></span></div>
            <div><Check/><span><b>Previous-game + recent trend context</b><small>{notebookProducerPack.meta.recentGameCount} recent completed games can provide continuity without replacing the current game.</small></span></div>
            <div><Check/><span><b>RTG mechanics excluded</b><small>No overall, coach trust, skill points, wear, GPA, followers, NIL systems or progression-menu data is exported.</small></span></div>
            <div><Check/><span><b>Full DynastyHQ transcript</b><small>{notebookProducerPack.meta.hasTranscript?'Complete saved transcript included as a secondary editorial reference.':'No transcript was saved for the selected game. The verified research pack still downloads; generate the podcast transcript separately.'}</small></span></div>
            <div><Check/><span><b>Optional episode chapter map</b><small>{notebookProducerPack.meta.chapterMapSource==='saved'?'Saved episode chapters are included.':'A suggested chapter map is included, built from the selected game\'s verified context.'}</small></span></div>
          </div>

          {!notebookProducerPack.meta.hasTranscript && notebookTargetData.selection?.hasGame && <div className="notebook-missing-transcript">
            <span><ShieldCheck/><strong>NO SAVED PODCAST SCRIPT FOR THIS GAME</strong></span>
            <p>The producer pack still includes verified game research and a suggested episode map, but it cannot include a transcript that was never saved. Use Podcast-only generation to create one without rewriting the Newsroom or game.</p>
            <button type="button" onClick={onRegenerateCoverage}><Mic2/>OPEN PODCAST-ONLY GENERATION</button>
          </div>}
          <div className="notebook-actions">
            <button className="yellow" onClick={downloadNotebookPack}><FileText/>DOWNLOAD WEEK {notebookProducerPack.meta.week} PRODUCER PACK<ChevronRight/></button>
            <button className="ghost" onClick={copyNotebookCustomizePrompt}><Copy/>COPY OPTIONAL DEEP DIVE FOCUS</button>
            {latestNotebookIsDifferent && latestNotebookPack && <button className="ghost latest-pack" onClick={downloadLatestNotebookPack}><Archive/>DOWNLOAD LATEST GAME · W{latestNotebookPack.meta.week} {latestNotebookPack.meta.opponent}</button>}
          </div>
        </article>

        <aside className="notebook-tip">
          <BookOpen/>
          <span>BUILT FOR NOTEBOOKLM AUDIO OVERVIEW</span>
          <h3>Producer brief first. Deep research underneath.</h3>
          <p>The downloaded pack already contains the show, host-opening and research guidance. In NotebookLM, choose Deep Dive and set the length to Short. The copy button is optional extra reinforcement, not something that has to live inside every source pack.</p>
          <div className="notebook-tip-stats">
            <span><b>{notebookProducerPack.meta.storylineCount}</b> storylines</span>
            <span><b>{notebookProducerPack.meta.scoringCount}</b> scoring references</span>
            <span><b>{notebookProducerPack.meta.screenshotStatCount || notebookProducerPack.meta.supportingFactCount}</b> screenshot stats</span>
          </div>
        </aside>
      </div>}
    </section>

    <section className="previous-episodes pod-archive-v2">
      <div className="previous-head">
        <div><span>LATEST FROM THE HUDDLE</span><h2>Previous Episodes</h2></div>
        <div className="previous-controls">
          <button className="archive-arrow" onClick={()=>scrollArchive(-1)} aria-label="Scroll previous episodes left"><ChevronLeft/></button>
          <button className="archive-arrow" onClick={()=>scrollArchive(1)} aria-label="Scroll previous episodes right"><ChevronRight/></button>
          <button className="view-all-episodes" onClick={()=>setShowAllEpisodes(v=>!v)}>{showAllEpisodes?'Carousel view':'All episodes'}<ChevronRight/></button>
        </div>
      </div>
      <div ref={archiveRef} className={showAllEpisodes?'episode-cards episode-archive-all pod-episode-cards-v2':'episode-cards episode-carousel pod-episode-cards-v2'}>
        {archiveEpisodes.length ? archiveEpisodes.map((item,index)=><button key={item.publicationId||index} onClick={()=>openArchiveMoment(item.season,item.week,'podcast','episode')}>
          <img src={podcastCoverForPublication(item.publicationId,item.coverUrl)} alt=""/>
          <span>SEASON {item.season} • {item.week? `WEEK ${item.week}`:'ARCHIVE'}</span>
          <b>{item.title}</b>
          <small>{item.duration} • {item.audioReady?'Audio ready':'Transcript available'}</small>
          <Play/>
        </button>) : <button onClick={()=>notify('No earlier saved podcast episodes were found in this career yet.')}><img src={showCover || podcastCover} alt=""/><span>ARCHIVE</span><b>No previous saved episodes</b><small>Your older episodes will appear here automatically.</small><Archive/></button>}
      </div>
    </section>
  </div>;
}

function OffseasonPage({data,visual,go,openPodcast,openArticle,notify}){
  const o=data.offseason || {};
  const record=o.teamRecord || {wins:0,losses:0};
  const line=o.playerLine || {};
  const status=o.currentStatus || {};
  const decision=o.decision || {};
  const remaining=o.schedule?.remaining?.length || 0;
  const awards=Array.isArray(o.awards)?o.awards:[];
  const movement=Array.isArray(o.movement)?o.movement:[];
  const seasonComplete=Boolean(o.seasonComplete);
  const decisionComplete=Boolean(decision.complete);
  const phases = [
    ['01','Season Review',seasonComplete?'done':'current'],
    ['02','Career Decision',decisionComplete?'done':seasonComplete?'current':'waiting'],
    ['03','Development',decisionComplete?'current':'waiting'],
    ['04','Next Chapter',o.nextSeasonReady?'current':'waiting'],
  ];
  const peak=o.peakPassing;
  const td=(line.passTD||0)+(line.rushTD||0);

  return <div className="page offseason-page">
    <section className="offseason-hero-redesign">
      <div className="offseason-hero-copy">
        <span className="offseason-kicker"><Target/>END OF SEASON · OFFSEASON MODE</span>
        <small>SEASON {o.season || data.season} · {o.school || data.player.school}</small>
        <h1>{seasonComplete?'THE YEAR IS DONE.':'FINISH THE YEAR.'}<br/><em>{seasonComplete?'BUILD WHAT’S NEXT.':'THE NEXT CHAPTER WAITS.'}</em></h1>
        <p>{o.dek || 'DynastyHQ is reading the real saved season state and will unlock the next steps only when the verified year is complete.'}</p>
        <div className="offseason-facts">
          <div><strong>{record.wins||0}–{record.losses||0}</strong><span>TEAM RECORD</span></div>
          <div><strong>{line.appearances||0}</strong><span>PLAYER APPEARANCES</span></div>
          <div><strong>{status.role || data.rtg?.rank || '—'}</strong><span>CURRENT ROLE</span></div>
          <div><strong>{seasonComplete?'DONE':'LIVE'}</strong><span>SEASON STATUS</span></div>
        </div>
      </div>
      <div className="offseason-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(0,24,18,.15),rgba(0,24,18,.02)),url(${visual.image})`,backgroundPosition:`${visual.position} 26%`}}/>
    </section>

    <OffseasonCoverageStudio data={data} notify={notify}/>

    <section className="offseason-phase-rail">
      {phases.map(([num,label,state])=><div key={num} className={`offseason-phase is-${state}`}><span>{state==='done'?<Check/>:num}</span><div><small>{state==='done'?'COMPLETE':state==='current'?'NOW':'LATER'}</small><strong>{label}</strong></div></div>)}
    </section>

    <section className="offseason-waiting">
      <div><CalendarDays/><span><small>{seasonComplete?'SEASON COMPLETE':'THE SEASON IS STILL LIVE'}</small><strong>{o.headline || (seasonComplete?'The offseason is ready.':'Offseason decisions stay locked until the schedule closes.')}</strong></span></div>
      <p>{seasonComplete ? (decision.detail || 'Your verified season is complete. Career decision and development data can now become the next chapter.') : (remaining ? `${remaining} scheduled game${remaining===1?'':'s'} remain before the real offseason flow opens.` : 'Keep processing the active season; DynastyHQ will not guess that the year is over.')}</p>
      <button onClick={()=>go('gamehub')}>BACK TO GAME HUB<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-review">
      <div className="offseason-section-head"><div><span>01 · SEASON REVIEW</span><h2>What the season became</h2></div><Trophy/></div>
      <div className="offseason-review-grid">
        <article><span>TEAM SEASON</span><strong>{record.wins||0}–{record.losses||0}</strong><p>Verified record for Season {o.season || data.season}.</p></article>
        <article className="offseason-line-card"><span>YOUR SEASON</span><strong>{data.player.name}</strong><div><b>{line.passYds||0}<small>PASS YDS</small></b><b>{td}<small>TOTAL TD</small></b><b>{line.rushYds||0}<small>RUSH YDS</small></b><b>{line.interceptions||0}<small>INT</small></b></div></article>
        <article><span>WHERE YOU STAND</span><strong>{status.role || '—'}</strong><p>{status.overall ?? data.player.overall} OVR · {o.school || data.player.school}</p></article>
      </div>
      <div className="offseason-season-notes">
        <div><span><TrendingUp/>HIGH-WATER MARK</span><strong>{peak ? `${peak.yards} passing yards vs ${peak.opponent}` : 'Season peak builds from verified games'}</strong><small>{peak ? `Week ${peak.week} · ${peak.result || 'game'}` : 'No qualifying peak game saved yet.'}</small></div>
        <div><span><Award/>SEASON MOVEMENT</span><strong>{movement.length} tracked development change{movement.length===1?'':'s'} · {awards.length} award{awards.length===1?'':'s'}</strong><small>Derived from saved RTG snapshots and season achievements.</small></div>
      </div>
    </section>

    <section className="offseason-section offseason-decision">
      <div className="offseason-section-head"><div><span>02 · CAREER DECISION</span><h2>{decision.headline || 'Stay or write a new chapter?'}</h2></div><Archive/></div>
      <p className="offseason-lead">{decision.detail || 'No offseason decision has been recorded yet.'}</p>
      <div className="offseason-choice-grid">
        <article><UserRound/><span>RETURN</span><strong>{o.school || data.player.school}</strong><p>{decision.state==='stay'?'Recorded as your next-season decision.':'Keep the current program chapter going.'}</p></article>
        <article><Target/><span>TRANSFER PORTAL</span><strong>{decision.state==='transfer'?(decision.destination || 'NEW PROGRAM'):decision.state==='exploring'?'EXPLORING':'NOT SELECTED'}</strong><p>{decision.state==='transfer'?'A transfer destination is saved.':decision.state==='exploring'?'Your real transfer board is active.':'Portal decision has not been recorded.'}</p></article>
      </div>
      <button className="offseason-primary" onClick={()=>notify(seasonComplete?'Decision controls will reconnect to your existing transfer workflow during the action pass.':'Career decisions remain locked until the verified season closes.')}><Target/>DECISION WORKFLOW STATUS<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-development">
      <div className="offseason-section-head"><div><span>03 · OFFSEASON DEVELOPMENT</span><h2>Build the next version of your player</h2></div><Sparkles/></div>
      <p className="offseason-lead">These values come from your current saved RTG status. When we reconnect uploads, the page will compare the next offseason capture against this baseline instead of inventing progression.</p>
      <div className="offseason-development-grid">
        <div><span>OVERALL</span><strong>{status.overall ?? data.player.overall ?? '—'}</strong><small>Current saved rating</small></div>
        <div><span>ROLE</span><strong>{status.role || '—'}</strong><small>Current depth-chart spot</small></div>
        <div><span>SKILL POINTS</span><strong>{status.skillPoints ?? '—'}</strong><small>Saved RTG status</small></div>
        <div><span>FOLLOWERS</span><strong>{status.followers ?? '—'}</strong><small>Saved RTG status</small></div>
      </div>
      <button className="offseason-secondary" onClick={()=>go('career')}><TrendingUp/>REVIEW CURRENT DEVELOPMENT<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-coverage">
      <div className="offseason-section-head"><div><span>SEASON COVERAGE</span><h2>How the season was told</h2></div><Newspaper/></div>
      <div className="offseason-coverage-grid">
        <article><Newspaper/><span>NEWSROOM · WEEK {data.news.week || data.game.week}</span><strong>{data.news.headline}</strong><p>{data.news.dek}</p><button onClick={()=>openArticle(data.news?.article?.id || '')}>READ COVERAGE<ChevronRight/></button></article>
        <article><Headphones/><span>THE HUDDLE · WEEK {data.game.week}</span><strong>{data.podcast.title}</strong><p>{data.podcast.summary}</p><button onClick={()=>openPodcast('episode')}>OPEN THE HUDDLE<ChevronRight/></button></article>
        <article><BookOpen/><span>CAREER CHRONICLE</span><strong>Season {o.season || data.season} Archive</strong><p>{data.chronicle?.latestSeason?.entries?.length || 0} saved Chronicle entries are attached to the current season.</p><button onClick={()=>go('chronicle')}>OPEN CHRONICLE<ChevronRight/></button></article>
      </div>
    </section>

    <section className="offseason-next">
      <div><span>04 · NEXT CHAPTER</span><h2>{o.nextSeasonReady?'The next chapter is ready to be prepared.':'The next season stays behind the curtain for now.'}</h2><p>{o.nextSeasonReady?'The verified season and career decision are complete. Advancing will remain disabled until the preview write/action stage.':'Finish the current requirements first; DynastyHQ will preserve this season exactly as it happened.'}</p></div>
      <div><button onClick={()=>go('career')}><UserRound/>REVIEW CAREER</button><button onClick={()=>go('chronicle')}><BookOpen/>VIEW SEASON ARCHIVE</button></div>
    </section>

    <footer className="offseason-footer"><BookOpen/><p><strong>Read-only real career view.</strong> Season results, development, decisions, and media shown here are pulled from your saved DynastyHQ data without writing anything back.</p></footer>
  </div>;
}

function CareerPage({data,visual,profileVisual,openProfilePhoto,go,openArchiveMoment}){
  const c=data.career || {};
  const totals=c.totals || data.totals || {};
  const profile=c.profile || {};
  const timeline=Array.isArray(c.timeline)?c.timeline:[];
  const rivalries=Array.isArray(c.rivalries)?c.rivalries:[];
  const honors=Array.isArray(c.honors)?c.honors:[];
  const lastName=data.player.name.split(' ').at(-1);
  const record=c.record || {wins:0,losses:0};
  const postseason=c.postseason || {appearances:0,wins:0,losses:0,passYds:0,rushYds:0,passTD:0,rushTD:0};
  const postseasonTD=(Number(postseason.passTD)||0)+(Number(postseason.rushTD)||0);
  const postseasonYds=(Number(postseason.passYds)||0)+(Number(postseason.rushYds)||0);

  return <div className="page career-page">
    <section className="career-hero-redesign">
      <div className="career-portrait" style={{backgroundImage:`linear-gradient(0deg,rgba(0,23,17,.18),rgba(0,23,17,.04)),url(${profileVisual.image})`,backgroundPosition:`${profileVisual.position} 25%`}}/>
      <div className="career-identity">
        <span className="career-kicker"><Sparkles/>CAREER OVERVIEW</span>
        <h1>{data.player.name.split(' ')[0] || 'PLAYER'}<br/><em>{lastName}</em></h1>
        <p>#{data.player.number} · {data.player.pos} · {data.player.school}</p>
        <div className="career-chapter">
          <div><small>CURRENT CHAPTER</small><strong>{c.stage || 'Road to Glory Player'}</strong><span>Season {data.season} · {data.weekLabel || `W${data.week}`}</span></div>
          <div><small>COLLEGE RECORD</small><strong>{record.wins||0}–{record.losses||0}</strong><span>{c.appearances||0} verified appearance{c.appearances===1?'':'s'}</span></div>
        </div>
      </div>
    </section>

    <section className="career-stat-row">
      <article><TrendingUp/><span>CAREER PASSING</span><strong>{(totals.passYds||0).toLocaleString()}</strong><small>{totals.passTD||0} TD · {totals.interceptions||0} INT</small></article>
      <article><Target/><span>CAREER RUSHING</span><strong>{(totals.rushYds||0).toLocaleString()}</strong><small>{totals.rushTD||0} rushing TD</small></article>
      <article><Shield/><span>DEVELOPMENT</span><strong>{profile.rank || (profile.overall && profile.overall!=='—'?`${profile.overall} OVR`:'Building')}</strong><small>{profile.coachTrust||0} coach trust · {profile.skillPoints||0} skill pts</small></article>
      <article><Trophy/><span>LEGACY</span><strong>{c.legacyCount||0}</strong><small>{honors.length} honor{honors.length===1?'':'s'} · {(c.milestones||[]).length} milestone{(c.milestones||[]).length===1?'':'s'}</small></article>
    </section>

    <section className="career-postseason-resume">
      <div><span><Trophy/>POSTSEASON RÉSUMÉ</span><h2>Playoff performances get their own chapter.</h2><p>Postseason games still count toward the full career totals above, while this line keeps the playoff run separate.</p></div>
      <div className="career-postseason-metrics">
        <article><strong>{postseason.wins||0}–{postseason.losses||0}</strong><span>POSTSEASON RECORD</span></article>
        <article><strong>{postseason.appearances||0}</strong><span>PLAYOFF APPEARANCES</span></article>
        <article><strong>{postseasonYds.toLocaleString()}</strong><span>TOTAL YARDS</span></article>
        <article><strong>{postseasonTD}</strong><span>TOTAL TD</span></article>
      </div>
    </section>

    <section className="career-content-grid">
      <article className="career-panel career-story-panel">
        <div className="career-panel-head"><div><span>CAREER STORY</span><h2>Timeline</h2></div><BookOpen/></div>
        <div className="career-timeline-list">
          {timeline.length ? timeline.map((entry)=><button key={entry.id} onClick={()=>openArchiveMoment(entry.season,entry.week,'chronicle')}><i/><span><small>SEASON {entry.season} · WEEK {entry.week}</small><strong>{entry.title}</strong><p>{entry.summary}</p></span><ChevronRight/></button>) : <div className="career-empty-copy">Your verified milestones and Chronicle events will collect here automatically.</div>}
        </div>
      </article>

      <aside className="career-side-stack">
        <article className="career-panel">
          <div className="career-panel-head"><div><span>PLAYER PROFILE</span><h2>Current Snapshot</h2></div><UserRound/></div>
          <dl className="career-profile-list">
            <div><dt>Height / Weight</dt><dd>{profile.height || '—'} / {profile.weight || '—'}</dd></div>
            <div><dt>Archetype</dt><dd>{profile.archetype || 'Not captured'}</dd></div>
            <div><dt>Overall</dt><dd>{profile.overall || data.player.overall || '—'}</dd></div>
            <div><dt>Depth Chart</dt><dd>{profile.rank || 'Not captured'}</dd></div>
            <div><dt>GPA</dt><dd>{profile.gpa || 'Not captured'}</dd></div>
            <div><dt>NIL / Followers</dt><dd>{(profile.valuation||0).toLocaleString()} / {(profile.followers||0).toLocaleString()}</dd></div>
          </dl>
          <button className="career-profile-photo-button" onClick={openProfilePhoto}><Camera/>CHANGE PROFILE PHOTO</button>
        </article>
        <article className="career-panel career-current-panel">
          <div className="career-panel-head"><div><span>CURRENT CHAPTER</span><h2>{c.stage || 'Road to Glory'}</h2></div><TrendingUp/></div>
          <strong>Season {data.season}</strong>
          <p>{c.appearances||0} verified college appearance{c.appearances===1?'':'s'} are already part of this career history, with the current saved role at {profile.rank || 'the captured depth-chart position'}.</p>
          <button onClick={()=>go('gamehub')}>OPEN GAME HUB<ChevronRight/></button>
        </article>
      </aside>
    </section>

    <section className="career-lower-grid">
      <article className="career-panel">
        <div className="career-panel-head"><div><span>HISTORY</span><h2>Rivalry Ledger</h2></div><ShieldCheck/></div>
        <div className="career-rivalries">
          {rivalries.length ? rivalries.map((r)=><div key={r.opponent}><span>{r.opponent}</span><strong>{r.wins}–{r.losses}</strong><small>Last played S{r.lastSeason}</small></div>) : <div className="career-empty-copy">Verified college opponents will build this ledger over time.</div>}
        </div>
      </article>
      <article className="career-panel">
        <div className="career-panel-head"><div><span>ACHIEVEMENTS</span><h2>Honors & Milestones</h2></div><Award/></div>
        <div className="career-honors">
          {honors.length ? honors.map((honor)=><div key={honor.id}><Trophy/><span><strong>{honor.name}</strong><small>{honor.year}</small></span></div>) : <div className="career-empty-copy">Awards and championships will collect here as your career grows.</div>}
        </div>
      </article>
    </section>

    <footer className="career-footer-redesign">
      <span>DynastyHQ Career · {data.player.name} · {c.stage || 'Road to Glory'}</span>
      <button onClick={()=>go('chronicle')}>OPEN CAREER CHRONICLE<ChevronRight/></button>
    </footer>
  </div>;
}

function ChroniclePage({data,visual,go,openPodcast,openArticle,openArchiveMoment,notify}){
  const chron=data.chronicle || {};
  const seasons=Array.isArray(chron.seasons)?chron.seasons:[];
  const initialSeason=seasons[0]?.season || data.season;
  const [season,setSeason] = useState(initialSeason);
  const [moment,setMoment] = useState('');
  const [museumTab,setMuseumTab] = useState('signatures');

  useEffect(()=>{
    if(!seasons.length) return;
    if(seasons.some((item)=>Number(item.season)===Number(data.season))){
      setSeason(Number(data.season));
      return;
    }
    if(!seasons.some((item)=>Number(item.season)===Number(season))) setSeason(seasons[0].season);
  },[data.chronicle,data.season,season]);

  const activeSeason=seasons.find((item)=>Number(item.season)===Number(season)) || seasons[0] || {
    season:data.season,school:data.player.school,role:data.rtg?.rank||'',record:{wins:0,losses:0},entries:[],signatureGames:[],appearances:0,passYds:0,passTD:0,rushYds:0,rushTD:0,totalTD:0,mediaCount:0,
  };
  const entries=Array.isArray(activeSeason.entries)?activeSeason.entries:[];
  const signatures=Array.isArray(activeSeason.signatureGames)?activeSeason.signatureGames:[];
  useEffect(()=>{
    const candidates=signatures.length?signatures:entries;
    if(!candidates.length){ setMoment(''); return; }
    if(!candidates.some((entry)=>String(entry.id||entry.publicationId)===String(moment))){
      setMoment(String(candidates[0].id||candidates[0].publicationId||''));
    }
  },[season,data.chronicle]);

  const active=entries.find((entry)=>String(entry.id||entry.publicationId)===String(moment))
    || signatures.find((entry)=>String(entry.id||entry.publicationId)===String(moment))
    || entries[0]
    || null;
  const game=active?.game || null;
  const totalTD=(Number(game?.passTD)||0)+(Number(game?.rushTD)||0);
  const totalYds=(Number(game?.passYds)||0)+(Number(game?.rushYds)||0);
  const scores=(()=>{
    if(!game) return {us:'—',them:'—'};
    if(game.teamScore!==undefined && game.opponentScore!==undefined) return {us:game.teamScore,them:game.opponentScore};
    const home=game.homeScore, away=game.awayScore;
    if(home===''||home===undefined||away===''||away===undefined) return {us:'—',them:'—'};
    return String(game.homeAway||'').toLowerCase()==='away' ? {us:away,them:home} : {us:home,them:away};
  })();
  const entryTitle=(entry)=>{
    if(!entry) return 'Career chapter';
    if(entry.title) return entry.title;
    if(entry.game) return `${entry.game.result || ''} vs ${entry.game.opponent || 'Opponent'}`.trim();
    return entry.type ? String(entry.type).replaceAll('-',' ') : 'Career moment';
  };
  const entrySummary=(entry)=>{
    if(!entry) return '';
    if(entry.summary) return entry.summary;
    if(entry.signatureReasons?.length) return entry.signatureReasons.join(' · ');
    if(entry.game) return `${Number(entry.game.passYds)||0} pass yds · ${Number(entry.game.rushYds)||0} rush yds · ${(Number(entry.game.passTD)||0)+(Number(entry.game.rushTD)||0)} total TD`;
    return 'Preserved career event.';
  };
  const record=activeSeason.record || {wins:0,losses:0};
  const allEntries=Array.isArray(chron.entries)?chron.entries:[];
  const allGames=allEntries.filter((entry)=>entry?.game && entry.game.didPlay!==false);
  const careerHigh=(selector)=>allGames.reduce((best,entry)=>{
    const value=selector(entry.game);
    return value>(best.value||0)?{value,entry}:best;
  },{value:0,entry:null});
  const highTotal=careerHigh((g)=>(Number(g.passYds)||0)+(Number(g.rushYds)||0));
  const highTD=careerHigh((g)=>(Number(g.passTD)||0)+(Number(g.rushTD)||0));
  const highRush=careerHigh((g)=>Number(g.rushYds)||0);
  const programs=[...new Set(seasons.map((item)=>item.school).filter(Boolean))];
  const mediaCount=seasons.reduce((sum,item)=>sum+(Number(item.mediaCount)||0),0);
  const officialMediaCount=allEntries.filter((entry)=>entry?.media?.official).length;
  const activeSeasonNumber=Number(active?.season || activeSeason.season || data.season);
  const activeWeekNumber=Number(active?.week ?? data.week);
  const latestWith=(selector)=>allEntries
    .slice()
    .sort((a,b)=>(Number(b.season)||0)-(Number(a.season)||0) || (Number(b.week)||0)-(Number(a.week)||0))
    .find(selector) || null;
  const latestNewsroomEntry=latestWith((entry)=>entry?.media?.newsroom);
  const latestPodcastEntry=latestWith((entry)=>entry?.media?.podcast);
  const latestOfficialEntry=latestWith((entry)=>entry?.media?.official);
  const latestLinkedMediaEntry=latestWith((entry)=>entry?.media?.newsroom || entry?.media?.podcast || entry?.media?.official || entry?.media?.photos?.length);

  const openChronicleMedia=(entry,target,tab='')=>{
    if(!entry){
      notify('No saved media is available for that Chronicle category yet.');
      return;
    }
    openArchiveMoment(Number(entry.season)||data.season,Number(entry.week)||0,target,tab);
  };

  return <div className="page chronicle-page">
    <section className="chronicle-hero-redesign" style={{'--page-photo':`url(${visual.image})`,'--photo-x':visual.position}}>
      <div>
        <span><Sparkles/>CAREER CHRONICLE</span>
        <h1>THE FILM OF<br/><em>THE CAREER</em></h1>
        <p>Every verified season, signature game, milestone, article, episode, and preserved career moment comes from the same DynastyHQ history you have already built.</p>
      </div>
      <aside>
        <div><strong>{seasons.length}</strong><span>SEASONS</span></div>
        <div><strong>S{data.season}</strong><span>CURRENT</span></div>
        <div><strong>{chron.signatureGames?.length || 0}</strong><span>SIGNATURES</span></div>
        <div><strong>{mediaCount}</strong><span>MEDIA LINKS</span></div>
      </aside>
    </section>

    <nav className="chronicle-season-nav" aria-label="Career seasons">
      {(seasons.length?seasons:[activeSeason]).map((s)=><button key={s.season} className={Number(season)===Number(s.season)?'active':''} onClick={()=>{setSeason(s.season); const target=(s.entries?.[0]?.week ?? s.signatureGames?.[0]?.week ?? 0); openArchiveMoment(s.season,target,'chronicle')}}><span>SEASON {s.season}</span><strong>{s.school || 'CAREER CHAPTER'}</strong><small>{s.record ? `${s.record.wins||0}–${s.record.losses||0} · ${s.role || data.player.pos}` : 'Archived chapter'}</small></button>)}
    </nav>

    <section className="chronicle-chapter">
      <div><span><CalendarDays/>SEASON {activeSeason.season} · {activeSeason.school || data.player.school}</span><h2>{activeSeason.role ? `${activeSeason.role} CHAPTER` : 'CAREER CHAPTER'}</h2><p>{activeSeason.appearances||0} verified appearance{activeSeason.appearances===1?'':'s'} · {(activeSeason.passYds||0).toLocaleString()} passing yards · {(activeSeason.totalTD||0)} total touchdowns.</p></div>
      <div className="chronicle-season-line">
        <div><strong>{record.wins||0}–{record.losses||0}</strong><span>RECORD</span></div>
        <div><strong>{activeSeason.appearances||0}</strong><span>APPEARANCES</span></div>
        <div><strong>{entries.length}</strong><span>PRESERVED ENTRIES</span></div>
        <div><strong>{signatures.length}</strong><span>SIGNATURES</span></div>
      </div>
    </section>

    <section className="chronicle-signatures">
      <header><div><span><Trophy/>SIGNATURE GAMES</span><h2>The weeks worth remembering</h2></div><small>Detected from verified career history</small></header>
      <div className="chronicle-signature-grid">
        {signatures.length ? signatures.slice(0,3).map((entry)=>{
          const g=entry.game||{};
          const id=String(entry.id||entry.publicationId||'');
          const td=(Number(g.passTD)||0)+(Number(g.rushTD)||0);
          return <button key={id} className={String(moment)===id?'active':''} onClick={()=>setMoment(id)}><span>{entry.weekLabel || entry.game?.weekLabel || `W${entry.week}`} · {entry.signatureLabel || 'SIGNATURE GAME'}</span><strong>{g.result || ''} vs {g.opponent || 'Opponent'}</strong><p>{Number(g.passYds)||0} pass yds · {td} TD</p><small>{entry.signatureReasons?.join(' · ') || 'Verified signature game'}</small><ChevronRight/></button>;
        }) : <div className="chronicle-empty-state">No signature games have been detected in this season yet. Chronicle will promote them automatically as the verified history grows.</div>}
      </div>
    </section>

    <section className="chronicle-moment">
      <div className="chronicle-moment-main">
        <span>{active?.signatureLabel || (game?'VERIFIED GAME':'CAREER MOMENT')} · SEASON {activeSeason.season}{active?.week!==undefined?` · ${active?.weekLabel || active?.game?.weekLabel || `W${active.week}`}`:''}</span>
        <h2>{entryTitle(active)}</h2>
        <p>{entrySummary(active)}</p>
        <div className="chronicle-moment-stats">
          <div><strong>{game ? `${scores.us}–${scores.them}` : '—'}</strong><span>SCORE / CONTEXT</span></div>
          <div><strong>{game ? Number(game.passYds)||0 : '—'}</strong><span>PASS YDS</span></div>
          <div><strong>{game ? totalTD : '—'}</strong><span>TOTAL TD</span></div>
          <div><strong>{game ? Number(game.int)||0 : '—'}</strong><span>INT</span></div>
        </div>
        <div className="chronicle-why"><span>WHY DYNASTYHQ KEPT THIS ONE</span><p>{active?.signatureReasons?.join(' · ') || entrySummary(active)}</p></div>
        <div className="chronicle-media-actions">
          <button onClick={()=>active?.media?.newsroom ? openArchiveMoment(activeSeasonNumber,activeWeekNumber,'newsroom') : notify('No Newsroom edition is attached to this career entry.')}><Newspaper/>READ NEWSROOM</button>
          <button onClick={()=>active?.media?.podcast ? openArchiveMoment(activeSeasonNumber,activeWeekNumber,'podcast','episode') : notify('No podcast episode is attached to this career entry.')}><Headphones/>PLAY THE HUDDLE</button>
          {active?.media?.official && <button onClick={()=>openArchiveMoment(activeSeasonNumber,activeWeekNumber,'newsroom')}><RadioIcon/>OFFICIAL COVERAGE</button>}
          <button onClick={()=>openArchiveMoment(activeSeasonNumber,activeWeekNumber,'gamehub')}><BarChart3/>OPEN GAME DATA</button>
        </div>
      </div>
      <aside className="chronicle-memory-stack">
        <span>MEMORY STACK</span>
        <button className="chronicle-memory-card" disabled={!active?.media?.newsroom} onClick={()=>active?.media?.newsroom && openArchiveMoment(activeSeasonNumber,activeWeekNumber,'newsroom')}>
          <Newspaper/><div><small>DYNASTYHQ NEWSROOM</small><strong>{active?.media?.newsroom?.headline || 'No article attached'}</strong><p>{active?.media?.newsroom?.dek || 'Newsroom coverage will appear when it exists for this entry.'}</p></div><ChevronRight/>
        </button>
        <button className="chronicle-memory-card" disabled={!active?.media?.podcast} onClick={()=>active?.media?.podcast && openArchiveMoment(activeSeasonNumber,activeWeekNumber,'podcast','episode')}>
          <Headphones/><div><small>THE HUDDLE</small><strong>{active?.media?.podcast?.title || 'No episode attached'}</strong><p>{active?.media?.podcast ? (active.media.podcast.finished?'Saved episode with audio ready.':'Saved episode/script attached to this week.') : 'Podcast coverage will appear when it exists for this entry.'}</p></div><ChevronRight/>
        </button>
        <button className={'chronicle-memory-card '+(active?.media?.official?'official-memory':'muted-memory')} disabled={!active?.media?.official} onClick={()=>active?.media?.official && openArchiveMoment(activeSeasonNumber,activeWeekNumber,'newsroom')}>
          <RadioIcon/><div><small>EA SPORTS NETWORK</small><strong>{active?.media?.official?.headline || 'No official article attached'}</strong><p>{active?.media?.official?.summary || 'Official in-game coverage will appear here when it was preserved with the week.'}</p></div><ChevronRight/>
        </button>
        <button className="chronicle-memory-card" disabled={!(active?.media?.photos?.length)} onClick={()=>active?.media?.photos?.length && openArchiveMoment(activeSeasonNumber,activeWeekNumber,active?.media?.newsroom?'newsroom':'gamehub')}>
          <ImageIcon/><div><small>PHOTO LIBRARY</small><strong>{active?.media?.photos?.length || 0} linked image{active?.media?.photos?.length===1?'':'s'}</strong><p>Open the preserved week where these career photos were used.</p></div><ChevronRight/>
        </button>
      </aside>
    </section>

    <section className="chronicle-timeline">
      <header><div><span><BookOpen/>SEASON TIMELINE</span><h2>Every verified chapter</h2></div><small>{entries.length} preserved entr{entries.length===1?'y':'ies'}</small></header>
      <div>
        {entries.length ? entries.map((entry,index)=>{
          const id=String(entry.id||entry.publicationId||`entry-${index}`);
          return <button key={id} className={String(moment)===id?'active':''} onClick={()=>setMoment(id)}><span>{entry.weekLabel || entry.game?.weekLabel || `W${entry.week ?? 0}`}</span><strong>{entryTitle(entry)}</strong><small>{entrySummary(entry)}</small>{entry.media?.newsroom?<Newspaper/>:<i/>}{entry.media?.podcast?<Headphones/>:<i/>}{entry.media?.official?<RadioIcon/>:<i/>}<ChevronRight/></button>;
        }) : <div className="chronicle-empty-state">No Chronicle entries are saved for this season yet.</div>}
      </div>
    </section>

    <section className="chronicle-museum">
      <header><div><span><Trophy/>CAREER MUSEUM</span><h2>The Legacy So Far</h2></div><small>Built automatically from preserved history</small></header>
      <nav>
        {[['signatures','SIGNATURE GAMES'],['records','RECORD BOOK'],['media','MEDIA VAULT'],['stops','CAREER STOPS']].map(([id,label])=><button key={id} className={museumTab===id?'active':''} onClick={()=>setMuseumTab(id)}>{label}</button>)}
      </nav>
      <div className="museum-content">
        {museumTab==='signatures' && <div className="museum-signature-grid">
          {(chron.signatureGames||[]).slice(0,6).map((entry,index)=><article key={entry.id||index}><span>S{entry.season} · {entry.weekLabel || entry.game?.weekLabel || `W${entry.week}`}</span><strong>{entry.signatureLabel || entryTitle(entry)}</strong><p>{entry.game?.opponent || 'Career moment'} · {entry.signatureReasons?.[0] || 'Verified signature'}</p></article>)}
          {!(chron.signatureGames||[]).length && <div className="chronicle-empty-state">Signature games will appear here automatically.</div>}
        </div>}
        {museumTab==='records' && <div className="museum-record-grid">
          <article><strong>{highTotal.value||0}</strong><span>TOTAL YARDS</span><small>{highTotal.entry ? `Career high · S${highTotal.entry.season} W${highTotal.entry.week}` : 'No games yet'}</small></article>
          <article><strong>{highTD.value||0}</strong><span>TOTAL TD</span><small>{highTD.entry ? `Career high · S${highTD.entry.season} W${highTD.entry.week}` : 'No games yet'}</small></article>
          <article><strong>{highRush.value||0}</strong><span>RUSH YDS</span><small>{highRush.entry ? `Career high · S${highRush.entry.season} W${highRush.entry.week}` : 'No games yet'}</small></article>
        </div>}
        {museumTab==='media' && <div className="museum-record-grid museum-media-grid">
          <button disabled={!latestNewsroomEntry} onClick={()=>openChronicleMedia(latestNewsroomEntry,'newsroom')}><Newspaper/><strong>{(data.state?.newsroomIssues||[]).length || data.news?.articles?.length || 0}</strong><span>NEWSROOM EDITIONS</span><small>{latestNewsroomEntry?'Open latest saved coverage':'No saved coverage yet'}</small><ChevronRight/></button>
          <button disabled={!latestPodcastEntry} onClick={()=>openChronicleMedia(latestPodcastEntry,'podcast','episode')}><Headphones/><strong>{(data.state?.podcastEpisodes||[]).length || 0}</strong><span>HUDDLE EPISODES</span><small>{latestPodcastEntry?'Open latest saved episode':'No saved episode yet'}</small><ChevronRight/></button>
          <button disabled={!latestOfficialEntry} onClick={()=>openChronicleMedia(latestOfficialEntry,'newsroom')}><RadioIcon/><strong>{officialMediaCount}</strong><span>OFFICIAL ARTICLES</span><small>{latestOfficialEntry?'Open latest EA SPORTS artifact':'No official article yet'}</small><ChevronRight/></button>
          <button disabled={!latestLinkedMediaEntry} onClick={()=>openChronicleMedia(latestLinkedMediaEntry,latestLinkedMediaEntry?.media?.newsroom?'newsroom':'gamehub')}><Camera/><strong>{mediaCount}</strong><span>LINKED MEDIA</span><small>{latestLinkedMediaEntry?'Open latest preserved media week':'No linked media yet'}</small><ChevronRight/></button>
        </div>}
        {museumTab==='stops' && <div className="museum-signature-grid">
          {programs.length ? programs.map((school,index)=><article key={school}><span>CAREER STOP {index+1}</span><strong>{school}</strong><p>{seasons.filter((s)=>s.school===school).map((s)=>`Season ${s.season}`).join(' · ')}</p></article>) : <div className="chronicle-empty-state">Career programs will collect here as the journey grows.</div>}
        </div>}
      </div>
    </section>
  </div>;
}

function Newsroom({data,visual,profileVisual,podcastEpisodeCover,openProfilePhoto,onRegenerateCoverage,articleOpen,setArticleOpen,selectedArticleId,setSelectedArticleId,officialArticleRequest,openArticle,openPodcast,openArchiveMoment,go,playing,setPlaying,notify}){
  const news=data.news || {};
  const [archiveOpen,setArchiveOpen]=useState(false);
  const [officialOpen,setOfficialOpen]=useState(null);
  const articlePhotoInputRef=useRef(null);
  const articlePhotoTargetRef=useRef(null);
  const [articlePhotoBusy,setArticlePhotoBusy]=useState(false);
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  const articles=Array.isArray(news.articles)?news.articles:[];
  const leadStory=articles.find((entry)=>entry.id===news.article?.id) || articles[0] || news.article || null;
  const selectedStory=articles.find((entry)=>entry.id===selectedArticleId) || leadStory;
  const localStory=articles.find((entry)=>entry.id===news.localArticleId) || null;
  const nationalStory=articles.find((entry)=>entry.id===news.nationalArticleId) || null;
  const leadPhoto=leadStory?.photo?.url || news.weeklyPhoto?.url || visual.image;
  const leadPhotoCaption=leadStory?.photoCaption || leadStory?.dek || news.dek;
  const officialStories=Array.isArray(news.officialArticles)?news.officialArticles:[];

  useEffect(()=>{
    if(!officialArticleRequest || !officialStories.length) return;
    setArchiveOpen(false);
    setArticleOpen(false);
    setSelectedArticleId('');
    setOfficialOpen(officialStories[0]);
    window.requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'smooth'}));
  },[officialArticleRequest,officialStories[0]?.id]);

  const newsroomArchive=(Array.isArray(data.chronicle?.entries)?data.chronicle.entries:[])
    .filter((entry)=>entry?.media?.newsroom)
    .slice()
    .sort((a,b)=>(Number(b.season)||1)-(Number(a.season)||1) || (Number(b.week)||0)-(Number(a.week)||0));

  const switchSavedStory=(story)=>{
    if(!story) return;
    const scrollY=window.scrollY;
    setSelectedArticleId(story.id);
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      window.scrollTo({top:scrollY,left:0,behavior:'auto'});
    }));
  };

  const openSavedStory=(story,label)=>{
    setArchiveOpen(false);
    setOfficialOpen(null);
    if(!story){
      notify(`No saved ${label} article exists for this edition yet.`);
      return;
    }
    if(articleOpen){
      switchSavedStory(story);
      return;
    }
    setSelectedArticleId(story.id);
    setArticleOpen(true);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const chooseArticlePhoto=(story)=>{
    if(!story?.id) return;
    articlePhotoTargetRef.current=story;
    articlePhotoInputRef.current?.click();
  };

  const uploadArticlePhoto=async(file)=>{
    const target=articlePhotoTargetRef.current;
    if(!file || !target?.id || articlePhotoBusy) return;
    if(!file.type?.match(/^image\/(png|jpe?g|webp)$/i)){
      notify('Choose a PNG, JPEG, or WebP image for this article.');
      return;
    }
    if(file.size>12_000_000){
      notify('That article photo is larger than 12 MB. Choose a smaller image.');
      return;
    }
    const signedInUser=auth.currentUser;
    if(!signedInUser || signedInUser.isAnonymous){
      notify('Sign in with your DynastyHQ owner account before changing article photos.');
      return;
    }

    const targetPublicationId=String(news.publicationId || createWeekKey(data.season,news.week || game.week));
    const targetSeason=Number(data.season)||1;
    const targetWeek=Number(news.week || game.week)||0;
    setArticlePhotoBusy(true);
    try{
      const assetId=globalThis.crypto?.randomUUID?.() || `article-photo-${Date.now()}`;
      const imageDataUrl=await compressImage(file,2000,0.9);
      const uploaded=await uploadNewsroomMedia({
        firebaseApp,
        appId:productionAppId,
        userId:signedInUser.uid,
        assetId,
        imageDataUrl,
        fileName:file.name,
        origin:NEWSROOM_MEDIA_ORIGINS.UPLOAD,
      });
      const asset=createNewsroomMediaAsset({
        id:assetId,
        ...uploaded,
        fileName:file.name,
        origin:NEWSROOM_MEDIA_ORIGINS.UPLOAD,
        photoType:'general',
        careerFolder:targetPublicationId,
        allowAutoAssign:false,
      });

      await runTransaction(db,async(transaction)=>{
        const loaded=await readHydratedCareerInTransaction({
          transaction,
          db,
          appId:productionAppId,
          userId:signedInUser.uid,
        });
        if(!loaded) throw new Error('The live DynastyHQ career could not be loaded.');
        const remote=loaded.state;
        const issue=(remote.newsroomIssues || []).find((entry)=>previewMatchesPublication(
          entry,
          targetPublicationId,
          targetSeason,
          targetWeek,
        ));
        if(!issue) throw new Error('This Newsroom edition is no longer available.');
        const savedArticle=(issue.articles || []).find((entry)=>String(entry?.id || '')===String(target.id));
        if(!savedArticle) throw new Error('This article changed before the photo could be attached.');

        let nextState={
          ...remote,
          newsroomMediaLibrary:[...(remote.newsroomMediaLibrary || []),asset],
          newsroomIssues:assignNewsroomMedia({
            issues:remote.newsroomIssues || [],
            publicationId:issue.publicationId || issue.id || targetPublicationId,
            articleId:target.id,
            asset,
          }),
        };
        const regression=detectDestructiveCareerRegression(remote,nextState);
        if(regression.blocked) throw new Error('DynastyHQ blocked the photo update because the career changed unexpectedly. '+regression.reason);

        const savedAt=new Date().toISOString();
        nextState={
          ...nextState,
          _sync:{
            revision:(Number(loaded.rawMain?._sync?.revision)||0)+1,
            deviceId:PREVIEW_NEWSROOM_PHOTO_DEVICE_ID,
            updatedAt:savedAt,
          },
        };
        const storagePreview=splitCareerStateForStorage(nextState,savedAt);
        const mainBytes=estimatedJsonBytes(storagePreview.mainState);
        const largestArchiveBytes=storagePreview.archives.reduce((largest,archive)=>Math.max(largest,estimatedJsonBytes(archive)),0);
        if(mainBytes>=950*1024 || largestArchiveBytes>=950*1024){
          throw new Error('The article photo assignment would make the DynastyHQ save too large. Nothing was written.');
        }
        writeHydratedCareerInTransaction({
          transaction,
          db,
          appId:productionAppId,
          userId:signedInUser.uid,
          state:nextState,
        });
      });
      notify('Photo updated for this article only.');
    }catch(error){
      notify(error?.message || 'The article photo could not be updated.');
    }finally{
      setArticlePhotoBusy(false);
      articlePhotoTargetRef.current=null;
    }
  };

  return <div className="page newsroom-page">
    <input
      ref={articlePhotoInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      onChange={(event)=>{
        const file=event.target.files?.[0];
        event.target.value='';
        if(file) uploadArticlePhoto(file);
      }}
    />
    <section className="journal">
      <header className="masthead">
        <div className="mast-row"><h1>THE FOOTBALL JOURNAL</h1><span>{data.player.school} EDITION • SEASON {data.season} • WEEK {news.week || game.week}</span></div>
        <div className="journal-tabs">
          <button className={!articleOpen&&!archiveOpen&&!officialOpen?'active':''} onClick={()=>{setArchiveOpen(false);setOfficialOpen(null);setArticleOpen(false);setSelectedArticleId('');window.scrollTo({top:0,behavior:'smooth'})}}>Front Page</button>
          <button className={articleOpen && selectedStory?.id===localStory?.id?'active':''} onClick={()=>openSavedStory(localStory,'Local Beat')}>Local Beat</button>
          <button className={articleOpen && selectedStory?.id===nationalStory?.id?'active':''} onClick={()=>openSavedStory(nationalStory,'National')}>National</button>
          <button className={archiveOpen?'active':''} onClick={()=>{setOfficialOpen(null);setArticleOpen(false);setSelectedArticleId('');setArchiveOpen(true);window.scrollTo({top:0,behavior:'smooth'})}}>Archive</button>
          {data.selection?.hasGame && <button type="button" className="newsroom-regenerate-coverage" onClick={onRegenerateCoverage}><Sparkles/>REGENERATE COVERAGE</button>}
        </div>
      </header>

      {archiveOpen ? (
        <section className="newsroom-archive-browser">
          <header><div><span>NEWSROOM ARCHIVE</span><h2>Every saved edition</h2><p>Jump directly to the real Newsroom coverage attached to any preserved career week.</p></div><b>{newsroomArchive.length} EDITIONS</b></header>
          <div className="newsroom-archive-grid">
            {newsroomArchive.length ? newsroomArchive.map((entry)=>{
              const item=entry.media.newsroom;
              const current=Number(entry.season)===Number(data.season) && Number(entry.week)===Number(news.week || game.week);
              return <button key={entry.id||entry.publicationId||entry.season+'-'+entry.week} className={current?'current':''} onClick={()=>{setArchiveOpen(false);openArchiveMoment(entry.season,entry.week,'newsroom')}}>
                <span>SEASON {entry.season} · WEEK {entry.week}{current?' · CURRENT VIEW':''}</span>
                <h3>{item.headline || 'Saved Newsroom edition'}</h3>
                <p>{item.dek || entry.summary || 'Open this preserved career week to read its attached Newsroom edition.'}</p>
                <div><em>{entry.game?.opponent?'vs '+entry.game.opponent:'Career update'}</em><ChevronRight/></div>
              </button>;
            }) : <div className="newsroom-archive-empty"><Archive/><b>No saved Newsroom editions yet.</b><span>Published editions will collect here automatically.</span></div>}
          </div>
        </section>
      ) : officialOpen ? (
        <OfficialCoverageReader
          story={officialOpen}
          season={data.season}
          week={news.week || game.week}
          opponent={game.opponent}
          onBack={()=>{setOfficialOpen(null);window.scrollTo({top:0,behavior:'smooth'})}}
        />
      ) : articleOpen ? (
        <NewsroomArticle
          data={data}
          visual={visual}
          story={selectedStory}
          articles={articles}
          onSelectStory={switchSavedStory}
          onBack={()=>{setArticleOpen(false);setSelectedArticleId('');window.scrollTo({top:0,behavior:'smooth'})}}
          onChangeArticlePhoto={chooseArticlePhoto}
          articlePhotoBusy={articlePhotoBusy}
          go={go}
          openPodcast={openPodcast}
        />
      ) : (
        <>
          <section className="lead-story">
            <div className="lead-copy">
              <span>{leadStory?.kicker || news.kicker || 'GAME RECAP'}</span>
              <h2>{leadStory?.headline || news.headline}</h2>
              <p>{leadStory?.dek || news.dek}</p>
              <div className="lead-outlet-row"><b>{leadStory?.outletName || news.outlet}</b><small>{articles.length} STORIES IN THIS EDITION</small></div>
              <button className="yellow" onClick={()=>openSavedStory(leadStory,'lead')}>Read full story<ChevronRight/></button>
            </div>
            <div className="lead-image" style={{backgroundImage:`linear-gradient(90deg,rgba(242,239,230,.22),transparent 28%),linear-gradient(0deg,rgba(0,40,28,.06),transparent),url(${leadPhoto})`,backgroundPosition:`${visual.position} 29%`}}>
              <div className="journal-photo-credit"><span>{leadStory?.photo ? 'WEEK GAME PHOTO' : 'PAGE HERO'}</span><small>{leadPhotoCaption}</small></div>
            </div>
          </section>

          <section className="journal-score">
            <div><Logo team={data.player.school}/><b>{data.player.school}</b><strong>{game.us}</strong></div><span>FINAL</span><div><strong>{game.them}</strong><Logo team={game.opponent}/><b>{game.opponent}</b></div><i/>
            <div><b>{lastName}</b></div><div><strong>{game.total}</strong><small>TOTAL YARDS</small></div><div><strong>{game.td}</strong><small>TOTAL TD</small></div>
          </section>

          <section className="newsroom-edition-deck">
            {articles.slice(0,4).map((story)=>{
              const photo=story.photo?.url || leadPhoto;
              const label=story.audience==='local'?'LOCAL BEAT':story.audience?.startsWith('national')?'NATIONAL':story.audience==='regional'?'REGIONAL':story.audience==='analysis'?'FILM ROOM':'COVERAGE';
              return <button key={story.id} className="edition-story-card" onClick={()=>openSavedStory(story,label)}>
                <div className="edition-story-photo" style={{backgroundImage:`linear-gradient(0deg,rgba(0,20,14,.42),transparent 55%),url(${photo})`}}/>
                <span>{label} · {story.outletName}</span>
                <strong>{story.headline}</strong>
                <small>{story.dek}</small>
                <em>Read article <ChevronRight/></em>
              </button>;
            })}
          </section>

          {officialStories.length>0 && <section className="ea-network-newsroom">
            <header><RadioIcon/><div><span>OFFICIAL NATIONAL COVERAGE</span><h2>EA SPORTS NETWORK</h2></div><b>{officialStories.length} STORY{officialStories.length===1?'':'IES'}</b></header>
            <div>
              {officialStories.map((entry,index)=>{
                const cardPage=entry.sourcePages?.find((page)=>page?.screenshotUrl || page?.imageDataUrl);
                const cardScreenshot=entry.screenshotUrl || entry.imageDataUrl || cardPage?.screenshotUrl || cardPage?.imageDataUrl || '';
                return <button key={entry.id || entry.headline || index} className={'ea-network-feature-card '+(cardScreenshot?'has-original':'')} onClick={()=>{setOfficialOpen(entry);window.scrollTo({top:0,behavior:'smooth'})}}>
                  {cardScreenshot && <div className="ea-network-thumb"><img src={cardScreenshot} alt="Original EA SPORTS Network article preview"/><span>ORIGINAL ARTICLE</span></div>}
                  <div className="ea-network-card-copy">
                    <span>OFFICIAL EA SPORTS NETWORK STORY</span>
                    <h3>{entry.headline || 'Official in-game article'}</h3>
                    {(entry.dek || entry.summary) && <p>{entry.dek || entry.summary}</p>}
                    <em className="ea-network-read">OPEN ORIGINAL STORY<ChevronRight/></em>
                  </div>
                </button>
              })}
            </div>
          </section>}

          <section className="journal-lower">
            <article className="journal-box inside reference-journal-box">
              <CardHeader title="INSIDE THE GAME" light/>
              <p>The verified numbers behind the latest saved game.</p>
              <div className="inside-grid"><div className="tiny-photo photo-tile" style={{backgroundImage:`url(${leadPhoto})`}}/><div><button onClick={()=>go('gamehub')}><ClipboardList/>Player stats<ChevronRight/></button><button onClick={()=>go('gamehub')}><BarChart3/>Scoring drives<ChevronRight/></button></div></div>
            </article>

            <article className="journal-box huddle reference-journal-box">
              <CardHeader title="THE HUDDLE" light/>
              <div className="huddle-grid">
                <button className="cover-play" onClick={()=>openPodcast('episode')}><img src={podcastEpisodeCover || podcastCover} alt="The Huddle"/><span><Play/></span></button>
                <div><small>Week {game.week}</small><h3>{data.podcast.title}</h3><p>{data.podcast.summary}</p><b>{data.podcast.duration}</b></div>
              </div>
              <div className="huddle-actions"><button onClick={()=>openPodcast('transcript')}><FileText/>Print transcript</button><button onClick={()=>openPodcast('notebook')}><Zap/>NotebookLM pack</button></div>
              {playing && <div className="now-playing">▶ Saved episode selected…</div>}
            </article>

            <article className="journal-box career-file reference-journal-box">
              <CardHeader title="THE CAREER FILE" light/>
              <div className="career-grid"><div className="back-photo photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,28,20,.25),transparent 60%),url(${profileVisual.image})`,backgroundPosition:`${profileVisual.position} 37%`}}><button className="profile-photo-change compact" onClick={openProfilePhoto} aria-label="Change career profile photo" title="Change career profile photo"><Camera/></button><span>{lastName}</span><b>{data.player.number}</b></div><div><h3>From the early chapters<br/>to the current spotlight.</h3><p>Follow {data.player.name}’s preserved career story, milestones, and defining weeks.</p><button onClick={()=>go('chronicle')}>Explore Chronicle<ChevronRight/></button></div></div>
            </article>
          </section>
        </>
      )}
    </section>
  </div>;
}

function OfficialCoverageReader({story,season,week,opponent,onBack}){
  const sourcePages=Array.isArray(story?.sourcePages)?story.sourcePages:[];
  const originalPages=sourcePages
    .filter((page)=>page?.screenshotUrl || page?.imageDataUrl)
    .map((page)=>({...page,src:page.screenshotUrl || page.imageDataUrl}));
  if(!originalPages.length && (story?.screenshotUrl || story?.imageDataUrl)){
    originalPages.push({pageNumber:1,src:story.screenshotUrl || story.imageDataUrl});
  }

  const savedStitch=story?.stitchedScreenshotUrl || story?.stitchedImageDataUrl || '';
  const [autoStitch,setAutoStitch]=useState('');
  const [stitching,setStitching]=useState(false);
  const [stitchFailed,setStitchFailed]=useState(false);
  const stitchKey=originalPages.map((page)=>page.src).join('|');

  useEffect(()=>{
    let active=true;
    if(savedStitch || !originalPages.length){
      setAutoStitch('');
      setStitching(false);
      setStitchFailed(false);
      return ()=>{active=false};
    }
    setStitching(true);
    setStitchFailed(false);
    stitchOfficialArticlePages(originalPages.map((page)=>page.src))
      .then((result)=>{
        if(!active) return;
        setAutoStitch(result.dataUrl);
        setStitchFailed(false);
      })
      .catch((error)=>{
        console.warn('EA article live auto-stitch failed',error);
        if(active) setStitchFailed(true);
      })
      .finally(()=>{if(active)setStitching(false)});
    return ()=>{active=false};
  },[savedStitch,stitchKey]);

  const stitchedSrc=savedStitch || autoStitch;

  return <article className="newsroom-article digital-feature article-skin-local article-skin-ea-official">
    <div className="newsroom-article-tools">
      <button className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>OFFICIAL • WEEK {week}</span>
      <div className="ea-official-tool-badge"><RadioIcon/>EA SPORTS NETWORK</div>
    </div>

    <header className="article-publication-banner ea-official-publication-banner">
      <div className="article-publication-mark"><RadioIcon/></div>
      <div className="article-publication-copy">
        <small>ORIGINAL IN-GAME PUBLICATION</small>
        <strong>EA SPORTS NETWORK</strong>
      </div>
      <div className="article-publication-meta">
        <span>Season {season}</span>
        <b>Week {week}</b>
      </div>
    </header>

    {stitchedSrc ? <section className="ea-stitched-document ea-auto-stitched" aria-label="Original EA SPORTS Network article">
      <img src={stitchedSrc} alt="Seamlessly stitched original EA SPORTS Network article"/>
    </section> : stitching ? <section className="ea-stitching-status">
      <Sparkles/><div><b>Building the original article view…</b><span>DynastyHQ is cropping the game UI and aligning the saved EA SPORTS Network pages.</span></div>
    </section> : originalPages.length && stitchFailed ? <section className="ea-stitched-document ea-stitch-fallback" aria-label="Original EA SPORTS Network article pages">
      {originalPages.map((page,index)=><div key={page.pageNumber || index} className="ea-stitched-page"><img src={page.src} alt={'EA SPORTS Network original article page '+(index+1)}/></div>)}
    </section> : <section className="ea-original-unavailable">
      <ImageIcon/>
      <div>
        <b>Original EA SPORTS Network screenshot pages are not attached to this older article.</b>
        <p>Re-upload the original EA SPORTS Network screenshots through Week Processing to restore the publication exactly as it appeared in-game.</p>
      </div>
    </section>}
  </article>;
}

function NewsroomArticle({data,visual,story,articles,onSelectStory,onBack,onChangeArticlePhoto,articlePhotoBusy,go,openPodcast}){
  const news=data.news || {};
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  const selected=story || news.article || {};
  const paragraphs=selected.paragraphs?.length ? selected.paragraphs : [
    selected.dek || news.dek || `${data.player.school} completed its latest verified game against ${game.opponent}.`,
    `${data.player.name} finished with ${game.total} total yards and ${game.td} total touchdowns in the saved game record.`,
    `The next scheduled opponent is ${data.next.opponent} in Week ${data.next.week}.`,
  ];
  const published=(()=>{
    if(!news.publishedAt) return '';
    const date=new Date(news.publishedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  })();
  const articlePhoto=selected.photo?.url || news.weeklyPhoto?.url || visual.image;
  const skin=selected.audience==='local'
    ? 'local'
    : selected.audience==='regional'
      ? 'regional'
      : selected.audience?.startsWith('national')
        ? 'national'
        : selected.audience==='analysis'
          ? 'analysis'
          : 'school';
  const audienceLabel=skin==='local'?'Local Beat':skin==='national'?'National Desk':skin==='regional'?'Regional Desk':skin==='analysis'?'Film Room':selected.category || 'Coverage';
  const publicationName=selected.outletName || news.outlet || 'DynastyHQ Sports';
  const publicationDeck=skin==='local'
    ? `EUGENE · ${data.player.school} FOOTBALL`
    : skin==='regional'
      ? 'PACIFIC NORTHWEST COLLEGE FOOTBALL'
      : skin==='national'
        ? 'NATIONAL COLLEGE FOOTBALL'
        : skin==='analysis'
          ? 'FILM · NUMBERS · PERFORMANCE'
          : `${data.player.school} FOOTBALL`;

  const outletSwitcher=<nav className="article-outlet-switcher" aria-label="This week's Newsroom articles">
    {(articles || []).map((entry)=><button key={entry.id} className={entry.id===selected.id?'active':''} onClick={()=>onSelectStory(entry)}>
      <span>{entry.audience==='local'?'LOCAL':entry.audience?.startsWith('national')?'NATIONAL':entry.audience==='regional'?'REGIONAL':entry.audience==='analysis'?'FILM':'STORY'}</span>
      <b>{entry.outletName}</b>
    </button>)}
  </nav>;

  const publicationBanner=<header className="article-publication-banner">
    <div className="article-publication-mark" aria-hidden="true">
      {skin==='national' ? <span>N</span> : skin==='regional' ? <span>PNW</span> : skin==='analysis' ? <BarChart3/> : <Newspaper/>}
    </div>
    <div className="article-publication-copy">
      <small>{publicationDeck}</small>
      <strong>{publicationName}</strong>
    </div>
    <div className="article-publication-meta">
      <span>Season {data.season}</span>
      <b>Week {news.week || game.week}</b>
    </div>
  </header>;

  const relatedCard=<section className="related-card">
    <span>RELATED COVERAGE</span>
    <button onClick={()=>go('gamehub')}><BarChart3/><b>Inside the Game</b><small>Player stats + scoring drives</small><ChevronRight/></button>
    <button onClick={()=>openPodcast('episode')}><Headphones/><b>The Huddle</b><small>{data.podcast.title} · {data.podcast.duration}</small><ChevronRight/></button>
    <button onClick={()=>go('chronicle')}><Archive/><b>Career File</b><small>Follow the preserved career story</small><ChevronRight/></button>
  </section>;

  const storyParagraphs=(className='')=><>
    {paragraphs.map((paragraph,index)=><p key={index} className={(index===0?'digital-lede ':'')+className}>{paragraph}</p>)}
    <button className="article-data-link" onClick={()=>go('gamehub')}><BarChart3/>View verified game data<ChevronRight/></button>
  </>;

  return <article className={`newsroom-article digital-feature article-skin-${skin}`} data-audience={skin}>
    <div className="newsroom-article-tools">
      <button className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>{audienceLabel} • WEEK {news.week || game.week}</span>
      <button className="article-photo-owner-button" disabled={articlePhotoBusy} onClick={()=>onChangeArticlePhoto?.(selected)}><Camera/>{articlePhotoBusy?'UPLOADING…':'CHANGE THIS ARTICLE PHOTO'}</button>
    </div>
    <div className="article-photo-owner-note"><ShieldCheck/><span>Photo changes apply only to this article. Every other Newsroom story keeps its own photo or week fallback.</span></div>

    {outletSwitcher}
    {publicationBanner}

    {skin==='local' ? <>
      <section className="local-article-head">
        <span className="local-article-slug">{selected.kicker || 'DUCKS FOOTBALL'}</span>
        <h1>{selected.headline || news.headline}</h1>
        <p>{selected.dek || news.dek}</p>
        <div className="local-article-meta">
          <span>By <b>{selected.byline || 'DynastyHQ Staff'}</b></span>
          {published && <time>Published {published}</time>}
        </div>
      </section>

      <figure className="local-article-photo">
        <div style={{backgroundImage:`url(${articlePhoto})`,backgroundPosition:`${visual.position} 26%`}}/>
        <figcaption><span>{selected.photoCaption || selected.dek || news.dek}</span><em>{selected.photo?'Week Game Photo':'Default hero fallback'}</em></figcaption>
      </figure>

      <div className="local-article-body">
        <main className="local-copy">
          <div className="article-section-label"><span>LOCAL BEAT</span><b>{publicationName}</b></div>
          {storyParagraphs('local-paragraph')}
        </main>
        <aside className="local-paper-rail">
          <section className="local-boxscore">
            <header>GAME AT A GLANCE</header>
            <div><Logo team={data.player.school}/><span><b>{data.player.school}</b><strong>{game.us}</strong></span></div>
            <i>FINAL</i>
            <div><Logo team={game.opponent}/><span><b>{game.opponent}</b><strong>{game.them}</strong></span></div>
            <dl>
              <div><dt>{lastName}</dt><dd>{game.total} total yds</dd></div>
              <div><dt>Passing</dt><dd>{game.pass} yds · {game.passTD} TD</dd></div>
              <div><dt>Rushing</dt><dd>{game.rush} yds · {game.rushTD} TD</dd></div>
            </dl>
          </section>
          {relatedCard}
        </aside>
      </div>
    </> : skin==='regional' ? <>
      <section className="regional-article-splash">
        <header className="regional-article-head">
          <span>{selected.kicker || 'NORTHWEST FOOTBALL'}</span>
          <h1>{selected.headline || news.headline}</h1>
          <p>{selected.dek || news.dek}</p>
          <div><b>{selected.byline || 'DynastyHQ Staff'}</b>{published&&<time>{published}</time>}</div>
        </header>
        <figure className="regional-article-photo">
          <div style={{backgroundImage:`linear-gradient(0deg,rgba(13,33,32,.12),transparent 55%),url(${articlePhoto})`,backgroundPosition:`${visual.position} 26%`}}/>
          <figcaption>{selected.photoCaption || selected.dek || news.dek}</figcaption>
        </figure>
      </section>

      <section className="regional-context-band">
        <div><small>FINAL</small><strong>{data.player.school} {game.us}–{game.them} {game.opponent}</strong></div>
        <div><small>TOTAL YARDS</small><strong>{game.total}</strong></div>
        <div><small>TOTAL TD</small><strong>{game.td}</strong></div>
        <div><small>NEXT</small><strong>W{data.next.week} · {data.next.opponent}</strong></div>
      </section>

      <div className="regional-article-body">
        <main className="regional-copy">
          <div className="article-section-label"><span>REGIONAL DESK</span><b>{publicationName}</b></div>
          {paragraphs.map((paragraph,index)=><React.Fragment key={index}>
            {index===2 && <blockquote className="regional-pullquote"><span>THE NORTHWEST VIEW</span>{selected.dek || news.dek}</blockquote>}
            <p className={index===0?'digital-lede':''}>{paragraph}</p>
          </React.Fragment>)}
          <button className="article-data-link" onClick={()=>go('gamehub')}><BarChart3/>Open full game data<ChevronRight/></button>
        </main>
        <aside className="regional-rail">
          <section className="regional-score-card">
            <header>NORTHWEST SCOREBOARD</header>
            <div><Logo team={data.player.school}/><b>{data.player.school}</b><strong>{game.us}</strong></div>
            <div><Logo team={game.opponent}/><b>{game.opponent}</b><strong>{game.them}</strong></div>
            <footer><span>{lastName}</span><b>{game.pass} PASS · {game.rush} RUSH</b></footer>
          </section>
          {relatedCard}
        </aside>
      </div>
    </> : skin==='national' ? <>
      <figure className="national-article-hero">
        <div style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.30),transparent 52%),url(${articlePhoto})`,backgroundPosition:`${visual.position} 25%`}}/>
        <figcaption><span>{selected.photoCaption || selected.dek || news.dek}</span><em>{selected.photo?'Week Game Photo':'DynastyHQ image'}</em></figcaption>
      </figure>

      <section className="national-headline-block">
        <span>{selected.kicker || 'COLLEGE FOOTBALL'}</span>
        <h1>{selected.headline || news.headline}</h1>
        <p>{selected.dek || news.dek}</p>
        <div className="national-byline"><b>{selected.byline || 'DynastyHQ Staff'}</b>{published&&<time>{published}</time>}<span>National Desk</span></div>
      </section>

      <section className="national-game-strip">
        <div className="national-matchup"><Logo team={data.player.school}/><b>{data.player.school}</b><strong>{game.us}</strong><i>FINAL</i><strong>{game.them}</strong><b>{game.opponent}</b><Logo team={game.opponent}/></div>
        <div><small>PASS</small><strong>{game.pass}</strong></div>
        <div><small>RUSH</small><strong>{game.rush}</strong></div>
        <div><small>TOTAL</small><strong>{game.total}</strong></div>
        <div><small>TD</small><strong>{game.td}</strong></div>
      </section>

      <div className="national-article-body">
        <main className="national-copy">
          <div className="article-section-label"><span>NATIONAL</span><b>{publicationName}</b></div>
          {storyParagraphs('national-paragraph')}
        </main>
        <aside className="national-rail">
          <section className="national-gamecenter">
            <header><span>GAMECENTER</span><b>Week {game.week}</b></header>
            <div><small>QB</small><strong>{data.player.name}</strong></div>
            <div><small>Total offense</small><strong>{game.total} YDS</strong></div>
            <div><small>Total TD</small><strong>{game.td}</strong></div>
            <div><small>Next opponent</small><strong>{data.next.opponent}</strong></div>
          </section>
          {relatedCard}
        </aside>
      </div>
    </> : <>
      <section className="digital-feature-top">
        <header className="digital-feature-head">
          <span className="digital-kicker">{selected.kicker || news.kicker || 'GAME RECAP'}</span>
          <h1>{selected.headline || news.headline}</h1>
          <p className="digital-deck">{selected.dek || news.dek}</p>
          <div className="digital-byline"><span>By <b>{selected.byline || 'DynastyHQ Staff'}</b> · {publicationName}</span>{published && <time>{published}</time>}</div>
        </header>
        <figure className="digital-hero-figure">
          <div className="digital-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(244,241,233,.12),transparent 18%),linear-gradient(0deg,rgba(0,20,14,.24),transparent 48%),url(${articlePhoto})`,backgroundPosition:`${visual.position} 26%`}}/>
          <figcaption><span>{selected.photoCaption || selected.dek || news.photoCaption || news.dek}</span><em>{selected.photo ? 'Week Game Photo' : 'Default hero fallback'}</em></figcaption>
        </figure>
      </section>

      <section className="digital-scorebar">
        <div className="digital-team"><Logo team={data.player.school}/><span><b>{data.player.school}</b><strong>{game.us}</strong></span></div>
        <em>FINAL</em>
        <div className="digital-team away"><span><strong>{game.them}</strong><b>{game.opponent}</b></span><Logo team={game.opponent}/></div>
        <i/>
        <div className="digital-stat"><strong>{game.pass}</strong><small>PASS YDS</small></div>
        <div className="digital-stat"><strong>{game.rush}</strong><small>RUSH YDS</small></div>
        <div className="digital-stat"><strong>{game.total}</strong><small>TOTAL YARDS</small></div>
        <div className="digital-stat"><strong>{game.td}</strong><small>TOTAL TD</small></div>
      </section>

      <div className="digital-story-layout">
        <main className="digital-story-copy"><div className="article-section-label"><span>{audienceLabel}</span><b>{publicationName}</b></div>{storyParagraphs()}</main>
        <aside className="digital-story-rail">
          <section className="snapshot-card">
            <div className="snapshot-head">GAME SNAPSHOT</div>
            <div className="snapshot-row"><span>Final</span><b>{data.player.school} {game.us}, {game.opponent} {game.them}</b></div>
            <div className="snapshot-row"><span>Passing</span><b>{game.pass} yards, {game.passTD} TD</b></div>
            <div className="snapshot-row"><span>Rushing</span><b>{game.rush} yards, {game.rushTD} TD</b></div>
            <div className="snapshot-row"><span>{lastName}</span><b>{game.total} total yards, {game.td} TD</b></div>
          </section>
          {relatedCard}
        </aside>
      </div>
    </>}

    <section className="digital-related-strip">
      <button onClick={()=>go('gamehub')}><BarChart3/><span><small>GAME DATA</small><b>See the verified numbers</b></span><ChevronRight/></button>
      <button onClick={()=>openPodcast('episode')}><Headphones/><span><small>THE HUDDLE</small><b>{data.podcast.title}</b></span><ChevronRight/></button>
      <button onClick={()=>go('chronicle')}><Archive/><span><small>CAREER FILE</small><b>Follow {lastName}’s season story</b></span><ChevronRight/></button>
    </section>
  </article>;
}

export default App;
