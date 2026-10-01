import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive, Award, BarChart3, Bell, BookOpen, CalendarDays, Camera, Check, ChevronDown, ChevronRight,
  ClipboardList, FileText, Headphones, Home, Image as ImageIcon, LockKeyhole, Menu,
  Mic2, MoreHorizontal, Newspaper, Pencil, Play, Search, Shield, ShieldCheck, Sparkles, Target,
  TrendingUp, Trophy, Upload, UserRound, X, Zap
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import podcastCover from '../assets/gridiron-grind-cover.webp';
import './preview.css';
import { useReadOnlyLiveCareer } from './useReadOnlyLiveCareer.js';

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

const fallbackData = {
  player: { name:'BRYAN WESSEL', number:'6', pos:'QB', school:'OREGON', overall:'76', headshot:'' },
  season: 4,
  week: 10,
  game: { week:10, opponent:'ILLINOIS', result:'W', us:54, them:48, pass:286, rush:124, total:410, passTD:6, rushTD:1, td:7, interceptions:2 },
  next: { week:11, opponent:'MARYLAND' },
  rtg: { rank:'QB1', coachTrust:'' },
  news: { headline:'Wessel leads Oregon past Illinois', dek:'Oregon secures a 54–48 victory behind 286 passing yards, 124 rush yards and 7 total TD from Bryan Wessel.' },
  podcast: { title:'Illinois recap', duration:'28:14' },
  totals: { passYds:2846, rushYds:742, passTD:28, rushTD:9, interceptions:8, appearances:4 },
};

function Logo({team='O', type=''}) {
  return <span className={'team-logo '+type} aria-hidden="true">{team}</span>;
}

function App(){
  const [page,setPage] = useState('home');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [season,setSeason] = useState(4);
  const [week,setWeek] = useState(10);
  const [articleOpen,setArticleOpen] = useState(false);
  const [statsTab,setStatsTab] = useState('player');
  const [toast,setToast] = useState('');
  const [playing,setPlaying] = useState(false);
  const [podcastTab,setPodcastTab] = useState('episode');
  const [liveAuthOpen,setLiveAuthOpen] = useState(false);
  const [liveEmail,setLiveEmail] = useState('');
  const [livePassword,setLivePassword] = useState('');
  const live = useReadOnlyLiveCareer();
  const data = live.data || fallbackData;

  useEffect(() => {
    if (!live.data) return;
    setSeason(live.data.season);
    setWeek(live.data.week);
  }, [live.data?.season, live.data?.week]);

  const pageTitle = useMemo(()=>pages.find(p=>p[0]===page)?.[1] || 'Home',[page]);
  const go = (next) => { setPage(next); if(next!=='newsroom') setArticleOpen(false); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openNewsArticle = () => { setPage('newsroom'); setArticleOpen(true); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openPodcast = (tab='episode') => { setPodcastTab(tab); setPage('podcast'); setArticleOpen(false); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const notify = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2200); };
  const connectLiveCareer = async (event) => {
    event.preventDefault();
    const ok = await live.signIn(liveEmail,livePassword);
    if (ok) {
      setLivePassword('');
      setLiveAuthOpen(false);
    }
  };

  return <div className="site-shell">
    <header className="site-header">
      <div className="top-row">
        <button className="brand" onClick={()=>go('home')}>DYNASTY<span>HQ</span></button>

        <nav className="desktop-nav" aria-label="Primary">
          {pages.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>{label}</button>)}

        </nav>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Search" onClick={()=>notify('Search preview') }><Search size={19}/></button>
          <button className="icon-btn" aria-label="Notifications" onClick={()=>notify('No new notifications in the mockup.') }><Bell size={19}/></button>
          <Logo />
          <button className="menu-btn" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu">{mobileMenu?<X/>:<Menu/>}</button>
        </div>
      </div>

      <div className={'mobile-drawer '+(mobileMenu?'open':'')}>
        {pages.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={17}/>{label}</button>)}
      </div>

      <div className="career-row">
        <div className="career-copy"><b>ROAD TO GLORY</b><i/>{data.player.name} #{data.player.number}<i/>{data.player.school}</div>
        <div className="selectors">
          <label>SEASON
            <select value={season} onChange={e=>setSeason(Number(e.target.value))}>
              <option value="4">4</option><option value="3">3</option>
            </select><ChevronDown size={13}/>
          </label>
          <label>WEEK
            <select value={week} onChange={e=>setWeek(Number(e.target.value))}>
              <option value="10">10</option><option value="9">9</option>
            </select><ChevronDown size={13}/>
          </label>
          <button className="dynasty-lock" onClick={()=>notify('Dynasty mode stays locked in this RTG preview.')}><LockKeyhole size={15}/>Dynasty</button>
        </div>
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

    <main>
      {page==='home' && <HomePage data={data} go={go} openArticle={openNewsArticle} openPodcast={openPodcast} notify={notify}/>} 
      {page==='gamehub' && <GameHub data={data} go={go} openPodcast={openPodcast} statsTab={statsTab} setStatsTab={setStatsTab} notify={notify}/>} 
      {page==='newsroom' && <Newsroom data={data} articleOpen={articleOpen} setArticleOpen={setArticleOpen} openArticle={openNewsArticle} openPodcast={openPodcast} go={go} playing={playing} setPlaying={setPlaying} notify={notify}/>} 
      {page==='podcast' && <PodcastPage data={data} go={go} playing={playing} setPlaying={setPlaying} podcastTab={podcastTab} setPodcastTab={setPodcastTab} notify={notify}/>} 
      {page==='offseason' && <OffseasonPage data={data} go={go} openPodcast={openPodcast} openArticle={openNewsArticle} notify={notify}/>}
      {page==='career' && <CareerPage data={data} go={go}/>}
      {page==='chronicle' && <ChroniclePage data={data} go={go} openPodcast={openPodcast} openArticle={openNewsArticle} notify={notify}/>} 
    </main>

    <nav className="mobile-bottom">
      <button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>Home</span></button>
      <button className={page==='gamehub'?'active':''} onClick={()=>go('gamehub')}><CalendarDays/><span>Week</span></button>
      <button className={page==='newsroom'?'active':''} onClick={()=>go('newsroom')}><Newspaper/><span>News</span></button>
      <button className={page==='podcast'?'active':''} onClick={()=>openPodcast('episode')}><Headphones/><span>Podcast</span></button>
      <button className={page==='offseason'?'active':''} onClick={()=>go('offseason')}><Target/><span>Offseason</span></button>
      <button className={page==='career'?'active':''} onClick={()=>go('career')}><UserRound/><span>Career</span></button>
      <button className={page==='chronicle'?'active':''} onClick={()=>go('chronicle')}><BookOpen/><span>Chronicle</span></button>
    </nav>

    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function LiveDataBar({live,open,setOpen,email,setEmail,password,setPassword,onConnect}){
  const connected=live.status==='connected';
  return <section className={'live-data-bar '+(connected?'is-connected':'')}>
    <div className="live-data-status">
      <ShieldCheck/>
      <span><b>{connected?'REAL CAREER DATA · READ ONLY':'SAMPLE PREVIEW DATA'}</b><small>{connected?'Reading your current live DynastyHQ save. No production writes are enabled.':'Connect your DynastyHQ account to populate this redesign from your real career without changing live data.'}</small></span>
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

function ScoreRibbon({data}){
  const game=data.game;
  const next=data.next;
  return <div className="score-ribbon">
    <div><span>W{game.week}</span><b>FINAL</b></div>
    <div className="score-team"><Logo team={data.player.school.slice(0,1)}/><span>{data.player.school}</span><strong>{game.us}</strong></div>
    <span className="dash">–</span>
    <div className="score-team away"><strong>{game.them}</strong><Logo team={game.opponent.slice(0,1)}/><span>{game.opponent}</span></div>
    <div className="score-sep"/>
    <div className="upnext"><b>UP NEXT</b><span>W{next.week}</span><Logo team={next.opponent.slice(0,1)}/><strong>{next.opponent}</strong></div>
  </div>;
}

function HomePage({data,go,openArticle,openPodcast,notify}){
  return <div className="page home-page">
    <section className="hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div className="hero-overlay"/>
      <div className="hero-copy">
        <span className="eyebrow">WEEK {data.game.week} <i/> FINAL</span>
        <h1><span>A NIGHT TO</span><em>REMEMBER</em></h1>
        <div className="hero-score">
          <div className="hero-score-team home-team"><Logo team={data.player.school.slice(0,1)}/><strong>{data.game.us}</strong><small>{data.player.school}</small></div>
          <span className="hero-final">FINAL</span>
          <div className="hero-score-team away-team"><strong>{data.game.them}</strong><Logo team={data.game.opponent.slice(0,1)}/><small>{data.game.opponent}</small></div>
        </div>
        <div className="hero-stats">
          <div><strong>{data.game.pass}</strong><span>PASS YDS</span></div>
          <div><strong>{data.game.rush}</strong><span>RUSH YDS</span></div>
          <div><strong>{data.game.td}</strong><span>TOTAL TD</span></div>
        </div>
        <div className="hero-actions">
          <button className="yellow" onClick={openArticle}><CalendarDays/>Open game recap<ChevronRight/></button>
          <button className="outline" onClick={()=>go('gamehub')}><BarChart3/>View verified stats</button>
        </div>
      </div>
      <div className="player-standin" aria-hidden="true">
        <div className="helmet"><Logo team={data.player.school.slice(0,1)}/></div>
        <div className="jersey">{data.player.number}</div>
        <div className="arm left"/>
        <div className="arm right"/>
      </div>
    </section>

    <section className="home-cards">
      <article className="dark-card next-week reference-next-week">
        <CardHeader title="YOUR NEXT WEEK"/>
        <div className="next-body">
          <Logo team={data.next.opponent.slice(0,1)} type="big"/>
          <div><small>WEEK {data.next.week}</small><h3>{data.next.opponent}</h3></div>
        </div>
        <p>Keep building. Prepare for your next opponent in your career journey.</p>
        <button className="yellow" onClick={()=>notify('Next-week preparation is sample-only in this preview.')}><CalendarDays/>Prepare next week<ChevronRight/></button>
      </article>

      <article className="dark-card wrap-card reference-wrap">
        <CardHeader title={`WEEK ${data.game.week} WRAP-UP`}/>
        <CheckRow title="Game stats reviewed" sub="Player and team performance updated"/>
        <CheckRow title="Coverage ready" sub="Article, media, and highlights available"/>
        <CheckRow title="Career updated" sub="Progress, milestones, and records tracked"/>
        <button className="outline full" onClick={()=>go('gamehub')}><BarChart3/>Open Game Hub<ChevronRight/></button>
      </article>

      <article className="paper-card newsroom-card reference-newsroom-card">
        <CardHeader title="FROM THE NEWSROOM" light/>
        <div className="news-flex">
          <div><h3>{data.news.headline}</h3><p>{data.news.dek}</p></div>
          <div className="thumb photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/>
        </div>
        <button className="pod-mini" onClick={()=>openPodcast('episode')}>
          <img src={podcastCover} alt="The Huddle"/>
          <span className="pod-copy"><b>THE HUDDLE</b><small>{data.podcast.title}</small><em>{data.podcast.duration}</em></span>
          <span className="pod-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
          <span className="pod-play"><Play/></span>
        </button>
      </article>
    </section>

    <section className="journey-strip">
      <div><b>YOUR JOURNEY</b><small>One career. Every chapter.</small></div>
      <div className="stage active"><span className="journey-helmet" aria-hidden="true"></span><b>Player</b><small>Build your legacy<br/>as a college star</small></div>
      <div className="stage"><Headphones/><b>Coordinator</b><small>Future Mode</small></div>
      <div className="stage"><Trophy/><b>Head coach</b><small>Future Mode</small></div>
    </section>
  </div>;
}

function CardHeader({title,light=false}){ return <div className={'card-title '+(light?'light':'')}><b>{title}</b><ChevronRight size={17}/></div>; }
function CheckRow({title,sub}){ return <div className="check-row"><span><Check/></span><div><b>{title}</b><small>{sub}</small></div></div>; }

function GameHub({data,go,openPodcast,statsTab,setStatsTab,notify}){
  const statContent = statsTab==='player'
    ? [[String(data.game.pass),'PASSING YARDS'],[String(data.game.rush),'RUSHING YARDS'],[String(data.game.total),'TOTAL YARDS'],[String(data.game.td),'TOTAL TD']]
    : statsTab==='team'
      ? [['54','POINTS'],['468','TOTAL YARDS'],['7','TOUCHDOWNS'],['0','TURNOVERS']]
      : [['7','SCORING DRIVES'],['4','PASS TD'],['3','RUSH TD'],['48','OPP PTS']];
  return <div className="page gamehub-page">
    <section className="hub-hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div><h1>GAME <em>HUB</em></h1><p>WEEK {data.game.week} / {data.game.opponent} / POSTGAME</p></div>
      <button className="yellow import" onClick={()=>notify('Screenshot import is disabled in this mockup preview.')}><Upload/>IMPORT SCREENSHOTS</button>
    </section>

    <section className="complete-strip">
      <div><h2>WEEK {data.game.week} COMPLETE</h2><p>All items belong to Season {data.season} • Week {data.game.week}</p></div>
      <div className="flow">{['Import','Review','Coverage','Archive'].map(x=><React.Fragment key={x}><span className="flow-step"><i><Check/></i>{x}</span>{x!=='Archive'&&<b/>}</React.Fragment>)}</div>
    </section>

    <section className="hub-grid">
      <div className="left-stack">
        <article className="paper-panel verified reference-verified">
          <div className="panel-head"><h2 className="verified-title"><span className="desktop-label">VERIFIED GAME DATA</span><span className="mobile-label">PLAYER STATS</span></h2>
            <div className="tabs">
              <button className={statsTab==='team'?'active':''} onClick={()=>setStatsTab('team')}>Team stats</button>
              <button className={statsTab==='player'?'active':''} onClick={()=>setStatsTab('player')}>Player stats</button>
              <button className={statsTab==='drives'?'active':''} onClick={()=>setStatsTab('drives')}>Scoring drives</button>
            </div>
          </div>

          <div className="player-summary">
            <div className="player-photo"><div className="fake-player photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,24,18,.10),rgba(0,24,18,.05)),url(${playerPhoto})`}}/></div>
            <div className="player-copy"><div className="player-name"><Logo team={data.player.school.slice(0,1)}/><div><h3>{data.player.name}</h3><p>#{data.player.number} &nbsp; | &nbsp; {data.player.pos} &nbsp; | &nbsp; {data.player.school}</p></div></div>
              <div className="stat-grid">{statContent.map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="ghost" onClick={()=>notify('Source screenshots are not connected in the visual preview.')}><Upload/>VIEW SOURCE SCREENSHOTS</button>
            <button className="ghost" onClick={()=>notify('Editing is disabled in the visual preview.')}><Pencil/>EDIT VERIFIED DATA</button>
          </div>
        </article>

        <article className="paper-panel material reference-material">
          <h2>GAME MATERIAL</h2>
          <div className="material-grid">
            <Material icon={FileText} title="Box score" sub="Game statistics and team totals attached." onClick={()=>notify('Box score detail is sample-only in this visual preview.')}/>
            <Material icon={ClipboardList} title="Scoring summary" sub="All scoring drives attached to this game." onClick={()=>setStatsTab('drives')}/>
            <Material icon={UserRound} title="Player ratings" sub="Individual player ratings attached." onClick={()=>notify('Player ratings detail is sample-only in this visual preview.')}/>
          </div>
        </article>
      </div>

      <div className="right-stack">
        <article className="paper-panel coverage reference-coverage">
          <h2>WEEKLY COVERAGE</h2>
          <CoverageRow icon={Newspaper} title="Newsroom edition" sub="Game recap and analysis." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={Mic2} title="Podcast transcript" sub="Full episode transcript." onClick={()=>openPodcast('transcript')}/>
          <CoverageRow icon={BookOpen} title="NotebookLM pack" sub="Game files and key moments." onClick={()=>openPodcast('notebook')}/>
          <button className="yellow full" onClick={()=>go('newsroom')}><Zap/>OPEN COVERAGE<ChevronRight/></button>
        </article>

        <article className="paper-panel development reference-development">
          <h2>PLAYER DEVELOPMENT</h2>
          <SimpleRow icon={BarChart3} title="Attribute changes" sub="See how this week impacted your player." onClick={()=>notify('Attribute-change details are sample-only in this visual preview.')}/>
          <SimpleRow icon={UserRound} title="Coach trust" sub="Build your role and earn opportunities." onClick={()=>notify('Coach-trust details are sample-only in this visual preview.')}/>
          <SimpleRow icon={ClipboardList} title="Training notes" sub="Focus areas for next week." onClick={()=>notify('Training-note details are sample-only in this visual preview.')}/>
          <button className="ghost full" onClick={()=>notify('Player development details are sample-only.')}><BarChart3/>REVIEW CHANGES<ChevronRight/></button>
        </article>
      </div>
    </section>

    <section className="hub-bottom">
      <div><b>UP NEXT</b><span>• WEEK {data.next.week}</span><Logo team={data.next.opponent.slice(0,1)}/><strong>{data.next.opponent}</strong></div>
      <button className="yellow" onClick={()=>notify(`Week ${data.next.week} preparation is still preview-only.`)}><CalendarDays/>PREPARE NEXT WEEK<ChevronRight/></button>
      <div className="future"><Archive/><span><b>DYNASTY WORKSPACE</b><small>Recruiting · Depth chart · Staff</small></span><em>COMING SOON</em></div>
    </section>
  </div>;
}

function Material({icon:Icon,title,sub,onClick}){ return <button className="material-card" onClick={onClick}><Icon/><div><b>{title}</b><small>{sub}</small></div><span><Check/></span><ChevronRight/></button>; }
function CoverageRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><em>READY</em><ChevronRight/></button>; }
function SimpleRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row simple" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><ChevronRight/></button>; }

function PodcastPage({data,go,playing,setPlaying,podcastTab,setPodcastTab,notify}){
  const episode=data.podcast || {};
  const game=data.game || {};
  const transcript = episode.segments?.length
    ? episode.segments.map((segment,index)=>[segment.speaker || `HOST ${index+1}`,segment.text])
    : [
      ['EPISODE BRIEF',episode.summary || 'This week does not have a generated podcast transcript yet.'],
      ['GAME CONTEXT',`${data.player.school} ${game.us}–${game.them} ${game.opponent}. ${game.pass} passing yards, ${game.rush} rushing yards, ${game.td} total touchdowns.`],
    ];
  const chapters=episode.chapters?.length
    ? episode.chapters.slice(0,6)
    : [
      {title:'Opening Drive',summary:`The Week ${game.week} result and why it mattered.`},
      {title:`${data.player.name.split(' ').at(-1)}’s Night`,summary:`${game.pass} passing, ${game.rush} rushing, ${game.td} total touchdowns.`},
      {title:'What Comes Next',summary:`The Week ${data.next.week} setup against ${data.next.opponent}.`},
    ];
  const facts=episode.sourceFacts || [];
  const scoringFacts=facts.filter((fact)=>/scor|drive|touchdown|field goal/i.test(`${fact?.key||''} ${fact?.label||''}`));
  const developmentFacts=facts.filter((fact)=>String(fact?.key||'').startsWith('rtg.') || String(fact?.key||'').includes('overall') || String(fact?.key||'').includes('development'));
  const prior=episode.previous || [];
  const playEpisode=()=> {
    if(episode.audioReady){
      setPlaying(v=>!v);
      notify('Saved podcast audio is detected. Full audio-file playback wiring is the next functionality pass.');
    } else {
      notify('This saved episode does not currently have ready audio attached. The transcript and source data are still available.');
    }
  };

  return <div className="page podcast-page">
    <section className="podcast-hero">
      <div className="podcast-hero-art">
        <img src={podcastCover} alt="The Huddle podcast cover"/>
        <button className="podcast-main-play" onClick={playEpisode}>{playing?<span className="pause-bars"><i/><i/></span>:<Play/>}</button>
      </div>
      <div className="podcast-hero-copy">
        <span className="podcast-kicker">THE HUDDLE • WEEK {game.week}</span>
        <h1 className="podcast-live-title">{episode.title || `WEEK ${game.week} RECAP`}</h1>
        <p>{episode.summary || `Game breakdown and verified career context from ${data.player.school} vs. ${game.opponent}.`}</p>
        <div className="podcast-meta"><span>{episode.duration || '—'}</span><i/><span>Season {data.season}</span><i/><span>Week {game.week}</span></div>

        <div className="audio-console">
          <button className="audio-play" onClick={playEpisode}>{playing?<span className="pause-bars"><i/><i/></span>:<Play/>}</button>
          <div className="audio-track">
            <div className="audio-wave" aria-hidden="true">{Array.from({length:34}).map((_,i)=><i key={i}/>)}</div>
            <div className="audio-time"><span>{episode.audioReady?(playing?'PLAYING':'SAVED AUDIO'):'SCRIPT ONLY'}</span><b>{episode.duration || '—'}</b></div>
          </div>
        </div>

        <div className="podcast-actions">
          <button className="yellow" onClick={()=>{setPodcastTab('transcript');setTimeout(()=>document.querySelector('.podcast-workspace')?.scrollIntoView({behavior:'smooth'}),50)}}><FileText/>OPEN TRANSCRIPT</button>
          <button className="outline" onClick={()=>{setPodcastTab('notebook');setTimeout(()=>document.querySelector('.podcast-workspace')?.scrollIntoView({behavior:'smooth'}),50)}}><Zap/>NOTEBOOKLM PACK</button>
        </div>
      </div>
    </section>

    <section className="podcast-context-strip">
      <div><small>FINAL</small><strong>{data.player.school} {game.us}–{game.them} {game.opponent}</strong></div>
      <i/>
      <div><small>{data.player.name.split(' ').at(-1)}</small><strong>{game.total} TOTAL YARDS</strong></div>
      <div><small>TOUCHDOWNS</small><strong>{game.td} TOTAL TD</strong></div>
      <button onClick={()=>go('gamehub')}>VIEW GAME DATA<ChevronRight/></button>
    </section>

    <section className="podcast-workspace">
      <div className="podcast-tabs">
        <button className={podcastTab==='episode'?'active':''} onClick={()=>setPodcastTab('episode')}>Episode</button>
        <button className={podcastTab==='transcript'?'active':''} onClick={()=>setPodcastTab('transcript')}>Transcript</button>
        <button className={podcastTab==='notebook'?'active':''} onClick={()=>setPodcastTab('notebook')}>NotebookLM</button>
      </div>

      {podcastTab==='episode' && <div className="episode-layout">
        <article className="episode-story">
          <span className="section-kicker">EPISODE BRIEF</span>
          <h2>{episode.title || `Week ${game.week} postgame show`}</h2>
          <p>{episode.summary || 'The episode uses the saved verified game packet and career context for this week.'}</p>
          <div className="episode-chapters">
            {chapters.map((chapter,index)=><div key={chapter.id||chapter.title||index}><b>{String(index+1).padStart(2,'0')}</b><span><strong>{chapter.title || `Chapter ${index+1}`}</strong><small>{chapter.summary || 'Saved episode chapter.'}</small></span></div>)}
          </div>
        </article>
        <aside className="episode-side">
          <section>
            <span>THIS SAVED EPISODE USES</span>
            <div><Check/>{facts.length} verified source facts</div>
            <div><Check/>{episode.segments?.length || 0} transcript segments</div>
            <div><Check/>{scoringFacts.length} scoring/drive references</div>
            <div><Check/>{developmentFacts.length} development references</div>
          </section>
          <section>
            <span>RELATED</span>
            <button onClick={()=>go('newsroom')}><Newspaper/><b>Read the game story</b><ChevronRight/></button>
            <button onClick={()=>go('gamehub')}><BarChart3/><b>Open Game Hub</b><ChevronRight/></button>
          </section>
        </aside>
      </div>}

      {podcastTab==='transcript' && <div className="transcript-layout">
        <article className="transcript-paper">
          <div className="transcript-head">
            <div><span>THE HUDDLE • SAVED TRANSCRIPT</span><h2>{episode.title || `Week ${game.week} Recap`}</h2><p>Season {data.season} • Week {game.week} • {data.player.school} {game.us}, {game.opponent} {game.them}</p></div>
            <button className="ghost" onClick={()=>window.print()}><FileText/>PRINT TRANSCRIPT</button>
          </div>
          {transcript.map(([title,body],index)=><section key={`${title}-${index}`}><h3>{title}</h3><p>{body}</p></section>)}
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
          <span className="section-kicker">NOTEBOOKLM SOURCE PACK</span>
          <h2>Week {game.week} • {game.opponent}</h2>
          <p>This view is now grounded in the same saved facts and transcript attached to the real DynastyHQ week.</p>
          <div className="source-list">
            <div><Check/><span><b>Game overview</b><small>{data.player.school} {game.us}–{game.them} {game.opponent} · Season {data.season}, Week {game.week}.</small></span></div>
            <div><Check/><span><b>Verified source facts</b><small>{facts.length} saved verified facts are attached to this publication.</small></span></div>
            <div><Check/><span><b>Scoring summary</b><small>{scoringFacts.length} saved facts reference scoring, drives, touchdowns, or field goals.</small></span></div>
            <div><Check/><span><b>Player development</b><small>{developmentFacts.length} saved facts reference RTG status, overall, or development.</small></span></div>
            <div><Check/><span><b>Podcast transcript</b><small>{episode.segments?.length || 0} saved transcript segments are available for source material.</small></span></div>
          </div>
          <button className="yellow" onClick={()=>notify('The real source data is mapped read-only. Download/export will be reconnected later in the preview workflow pass.')}><Zap/>SOURCE PACK STATUS<ChevronRight/></button>
        </article>
        <aside className="notebook-tip">
          <BookOpen/>
          <span>READ-ONLY BRIDGE</span>
          <h3>Same saved week. New presentation.</h3>
          <p>This redesign is reading the real DynastyHQ episode and verified publication data without changing the live career record.</p>
        </aside>
      </div>}
    </section>

    <section className="previous-episodes">
      <div className="previous-head"><div><span>THE ARCHIVE</span><h2>Previous Episodes</h2></div><button onClick={()=>notify('Archive selection will be wired during the workflow pass; these titles are already coming from your saved career.')}>View all episodes<ChevronRight/></button></div>
      <div className="episode-cards">
        {prior.length ? prior.map((item,index)=><button key={item.publicationId||index} onClick={()=>notify(`${item.title} is a real saved archive entry. Archive switching is the next interaction layer.`)}><span>{item.week? `WEEK ${item.week}` : `SEASON ${item.season}`}</span><b>{item.title}</b><small>{item.duration} • {item.audioReady?'Audio ready':'Transcript'}</small><Play/></button>) : <button onClick={()=>notify('No earlier saved podcast episodes were found in this career yet.')}><span>ARCHIVE</span><b>No previous saved episodes</b><small>Your older episodes will appear here automatically.</small><Archive/></button>}
      </div>
    </section>
  </div>;
}

function OffseasonPage({data,go,openPodcast,openArticle,notify}){
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
      <div className="offseason-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(0,24,18,.15),rgba(0,24,18,.02)),url(${playerPhoto})`}}/>
    </section>

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
      <button className="offseason-secondary" onClick={()=>notify('Offseason RTG capture stays disabled in this read-only stage.')}><Upload/>CAPTURE OFFSEASON UPDATE<ChevronRight/></button>
    </section>

    <section className="offseason-section offseason-coverage">
      <div className="offseason-section-head"><div><span>SEASON COVERAGE</span><h2>How the season was told</h2></div><Newspaper/></div>
      <div className="offseason-coverage-grid">
        <article><Newspaper/><span>NEWSROOM · WEEK {data.news.week || data.game.week}</span><strong>{data.news.headline}</strong><p>{data.news.dek}</p><button onClick={openArticle}>READ COVERAGE<ChevronRight/></button></article>
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

function CareerPage({data,go}){
  const c=data.career || {};
  const totals=c.totals || data.totals || {};
  const profile=c.profile || {};
  const timeline=Array.isArray(c.timeline)?c.timeline:[];
  const rivalries=Array.isArray(c.rivalries)?c.rivalries:[];
  const honors=Array.isArray(c.honors)?c.honors:[];
  const lastName=data.player.name.split(' ').at(-1);
  const record=c.record || {wins:0,losses:0};

  return <div className="page career-page">
    <section className="career-hero-redesign">
      <div className="career-portrait" style={{backgroundImage:`linear-gradient(0deg,rgba(0,23,17,.18),rgba(0,23,17,.04)),url(${playerPhoto})`}}/>
      <div className="career-identity">
        <span className="career-kicker"><Sparkles/>CAREER OVERVIEW</span>
        <h1>{data.player.name.split(' ')[0] || 'PLAYER'}<br/><em>{lastName}</em></h1>
        <p>#{data.player.number} · {data.player.pos} · {data.player.school}</p>
        <div className="career-chapter">
          <div><small>CURRENT CHAPTER</small><strong>{c.stage || 'Road to Glory Player'}</strong><span>Season {data.season} · Week {data.week}</span></div>
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

    <section className="career-content-grid">
      <article className="career-panel career-story-panel">
        <div className="career-panel-head"><div><span>CAREER STORY</span><h2>Timeline</h2></div><BookOpen/></div>
        <div className="career-timeline-list">
          {timeline.length ? timeline.map((entry)=><button key={entry.id} onClick={()=>go('chronicle')}><i/><span><small>SEASON {entry.season} · WEEK {entry.week}</small><strong>{entry.title}</strong><p>{entry.summary}</p></span><ChevronRight/></button>) : <div className="career-empty-copy">Your verified milestones and Chronicle events will collect here automatically.</div>}
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

function ChroniclePage({data,go,openPodcast,openArticle,notify}){
  const chron=data.chronicle || {};
  const seasons=Array.isArray(chron.seasons)?chron.seasons:[];
  const initialSeason=seasons[0]?.season || data.season;
  const [season,setSeason] = useState(initialSeason);
  const [moment,setMoment] = useState('');
  const [museumTab,setMuseumTab] = useState('signatures');

  useEffect(()=>{
    if(!seasons.length) return;
    if(!seasons.some((item)=>Number(item.season)===Number(season))) setSeason(seasons[0].season);
  },[data.chronicle,season]);

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
  const currentPublication=String(data.news?.publicationId||'');
  const activePublication=String(active?.media?.newsroom?.publicationId || active?.publicationId || '');

  return <div className="page chronicle-page">
    <section className="chronicle-hero-redesign">
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
      {(seasons.length?seasons:[activeSeason]).map((s)=><button key={s.season} className={Number(season)===Number(s.season)?'active':''} onClick={()=>setSeason(s.season)}><span>SEASON {s.season}</span><strong>{s.school || 'CAREER CHAPTER'}</strong><small>{s.record ? `${s.record.wins||0}–${s.record.losses||0} · ${s.role || data.player.pos}` : 'Archived chapter'}</small></button>)}
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
          return <button key={id} className={String(moment)===id?'active':''} onClick={()=>setMoment(id)}><span>WEEK {entry.week} · {entry.signatureLabel || 'SIGNATURE GAME'}</span><strong>{g.result || ''} vs {g.opponent || 'Opponent'}</strong><p>{Number(g.passYds)||0} pass yds · {td} TD</p><small>{entry.signatureReasons?.join(' · ') || 'Verified signature game'}</small><ChevronRight/></button>;
        }) : <div className="chronicle-empty-state">No signature games have been detected in this season yet. Chronicle will promote them automatically as the verified history grows.</div>}
      </div>
    </section>

    <section className="chronicle-moment">
      <div className="chronicle-moment-main">
        <span>{active?.signatureLabel || (game?'VERIFIED GAME':'CAREER MOMENT')} · SEASON {activeSeason.season}{active?.week!==undefined?` · W${active.week}`:''}</span>
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
          <button onClick={()=>active?.media?.newsroom ? (activePublication===currentPublication?openArticle():notify('That historical Newsroom edition is real and linked; archive-specific opening will be wired in the interaction pass.')) : notify('No Newsroom edition is attached to this career entry.')}><Newspaper/>READ NEWSROOM</button>
          <button onClick={()=>active?.media?.podcast ? (activePublication===currentPublication?openPodcast('episode'):notify('That historical Huddle episode is real and linked; archive-specific opening will be wired in the interaction pass.')) : notify('No podcast episode is attached to this career entry.')}><Headphones/>PLAY THE HUDDLE</button>
          <button onClick={()=>go('gamehub')}><BarChart3/>OPEN GAME DATA</button>
        </div>
      </div>
      <aside className="chronicle-memory-stack">
        <span>MEMORY STACK</span>
        <article><Newspaper/><div><small>DYNASTYHQ NEWSROOM</small><strong>{active?.media?.newsroom?.headline || 'No article attached'}</strong><p>{active?.media?.newsroom?.dek || 'Newsroom coverage will appear when it exists for this entry.'}</p></div></article>
        <article><Headphones/><div><small>THE HUDDLE</small><strong>{active?.media?.podcast?.title || 'No episode attached'}</strong><p>{active?.media?.podcast ? (active.media.podcast.finished?'Saved episode with audio ready.':'Saved episode/script attached to this week.') : 'Podcast coverage will appear when it exists for this entry.'}</p></div></article>
        <article><ImageIcon/><div><small>PHOTO LIBRARY</small><strong>{active?.media?.photos?.length || 0} linked image{active?.media?.photos?.length===1?'':'s'}</strong><p>Career photos remain attached to the week where they were used.</p></div></article>
      </aside>
    </section>

    <section className="chronicle-timeline">
      <header><div><span><BookOpen/>SEASON TIMELINE</span><h2>Every verified chapter</h2></div><small>{entries.length} preserved entr{entries.length===1?'y':'ies'}</small></header>
      <div>
        {entries.length ? entries.map((entry,index)=>{
          const id=String(entry.id||entry.publicationId||`entry-${index}`);
          return <button key={id} className={String(moment)===id?'active':''} onClick={()=>setMoment(id)}><span>W{entry.week ?? 0}</span><strong>{entryTitle(entry)}</strong><small>{entrySummary(entry)}</small>{entry.media?.newsroom?<Newspaper/>:<i/>}{entry.media?.podcast?<Headphones/>:<i/>}<ChevronRight/></button>;
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
          {(chron.signatureGames||[]).slice(0,6).map((entry,index)=><article key={entry.id||index}><span>S{entry.season} · W{entry.week}</span><strong>{entry.signatureLabel || entryTitle(entry)}</strong><p>{entry.game?.opponent || 'Career moment'} · {entry.signatureReasons?.[0] || 'Verified signature'}</p></article>)}
          {!(chron.signatureGames||[]).length && <div className="chronicle-empty-state">Signature games will appear here automatically.</div>}
        </div>}
        {museumTab==='records' && <div className="museum-record-grid">
          <article><strong>{highTotal.value||0}</strong><span>TOTAL YARDS</span><small>{highTotal.entry ? `Career high · S${highTotal.entry.season} W${highTotal.entry.week}` : 'No games yet'}</small></article>
          <article><strong>{highTD.value||0}</strong><span>TOTAL TD</span><small>{highTD.entry ? `Career high · S${highTD.entry.season} W${highTD.entry.week}` : 'No games yet'}</small></article>
          <article><strong>{highRush.value||0}</strong><span>RUSH YDS</span><small>{highRush.entry ? `Career high · S${highRush.entry.season} W${highRush.entry.week}` : 'No games yet'}</small></article>
        </div>}
        {museumTab==='media' && <div className="museum-record-grid">
          <article><Newspaper/><strong>{(data.state?.newsroomIssues||[]).length || data.news?.articles?.length || 0}</strong><span>NEWSROOM EDITIONS</span><small>Saved career coverage</small></article>
          <article><Headphones/><strong>{(data.state?.podcastEpisodes||[]).length || 0}</strong><span>HUDDLE EPISODES</span><small>Saved scripts and shows</small></article>
          <article><Camera/><strong>{mediaCount}</strong><span>LINKED MEDIA</span><small>Coverage + photos across Chronicle</small></article>
        </div>}
        {museumTab==='stops' && <div className="museum-signature-grid">
          {programs.length ? programs.map((school,index)=><article key={school}><span>CAREER STOP {index+1}</span><strong>{school}</strong><p>{seasons.filter((s)=>s.school===school).map((s)=>`Season ${s.season}`).join(' · ')}</p></article>) : <div className="chronicle-empty-state">Career programs will collect here as the journey grows.</div>}
        </div>}
      </div>
    </section>
  </div>;
}

function Newsroom({data,articleOpen,setArticleOpen,openArticle,openPodcast,go,playing,setPlaying,notify}){
  const news=data.news || {};
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  return <div className="page newsroom-page">
    <section className="journal">
      <header className="masthead">
        <div className="mast-row"><h1>THE FOOTBALL JOURNAL</h1><span>{data.player.school} EDITION • SEASON {data.season} • WEEK {news.week || game.week}</span></div>
        <div className="journal-tabs">
          <button className={!articleOpen?'active':''} onClick={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}}>Front Page</button>
          <button onClick={()=>notify(`${news.articles?.length || 0} real saved Newsroom stories are available for this week. Outlet switching is the next Newsroom interaction pass.`)}>Local Beat</button>
          <button onClick={()=>notify('National outlet switching will reuse the real saved Newsroom articles during the workflow pass.')}>National</button>
          <button onClick={()=>notify('The real Newsroom archive is connected in the data bridge; archive selection UI is next.')}>Archive</button>
        </div>
      </header>

      {articleOpen ? (
        <NewsroomArticle data={data} onBack={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}} go={go} openPodcast={openPodcast}/>
      ) : (
        <>
          <section className="lead-story">
            <div className="lead-copy">
              <span>{news.kicker || 'GAME RECAP'}</span>
              <h2>{news.headline}</h2>
              <p>{news.dek}</p>
              <button className="yellow" onClick={openArticle}>Read full story<ChevronRight/></button>
            </div>
            <div className="lead-image" style={{backgroundImage:`linear-gradient(90deg,rgba(242,239,230,.22),transparent 28%),linear-gradient(0deg,rgba(0,40,28,.06),transparent),url(${playerPhoto})`}}>
              <div className="journal-player"><span>{data.player.number}</span></div>
            </div>
          </section>

          <section className="journal-score">
            <div><Logo team={data.player.school.slice(0,1)}/><b>{data.player.school}</b><strong>{game.us}</strong></div><span>FINAL</span><div><strong>{game.them}</strong><Logo team={game.opponent.slice(0,1)}/><b>{game.opponent}</b></div><i/>
            <div><b>{lastName}</b></div><div><strong>{game.total}</strong><small>TOTAL YARDS</small></div><div><strong>{game.td}</strong><small>TOTAL TD</small></div>
          </section>

          <section className="journal-lower">
            <article className="journal-box inside reference-journal-box">
              <CardHeader title="INSIDE THE GAME" light/>
              <p>The verified numbers behind the latest saved game.</p>
              <div className="inside-grid"><div className="tiny-photo photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/><div><button onClick={()=>go('gamehub')}><ClipboardList/>Player stats<ChevronRight/></button><button onClick={()=>go('gamehub')}><BarChart3/>Scoring drives<ChevronRight/></button></div></div>
            </article>

            <article className="journal-box huddle reference-journal-box">
              <CardHeader title="THE HUDDLE" light/>
              <div className="huddle-grid">
                <button className="cover-play" onClick={()=>openPodcast('episode')}><img src={podcastCover} alt="The Huddle"/><span><Play/></span></button>
                <div><small>Week {game.week}</small><h3>{data.podcast.title}</h3><p>{data.podcast.summary}</p><b>{data.podcast.duration}</b></div>
              </div>
              <div className="huddle-actions"><button onClick={()=>openPodcast('transcript')}><FileText/>Print transcript</button><button onClick={()=>openPodcast('notebook')}><Zap/>NotebookLM pack</button></div>
              {playing && <div className="now-playing">▶ Saved episode selected…</div>}
            </article>

            <article className="journal-box career-file reference-journal-box">
              <CardHeader title="THE CAREER FILE" light/>
              <div className="career-grid"><div className="back-photo photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,28,20,.25),transparent 60%),url(${playerPhoto})`}}><span>{lastName}</span><b>{data.player.number}</b></div><div><h3>From the early chapters<br/>to the current spotlight.</h3><p>Follow {data.player.name}’s preserved career story, milestones, and defining weeks.</p><button onClick={()=>go('chronicle')}>Explore Chronicle<ChevronRight/></button></div></div>
            </article>
          </section>
        </>
      )}
    </section>
  </div>;
}

function NewsroomArticle({data,onBack,go,openPodcast}){
  const news=data.news || {};
  const game=data.game || {};
  const lastName=data.player.name.split(' ').at(-1);
  const paragraphs=news.paragraphs?.length ? news.paragraphs : [
    news.dek || `${data.player.school} completed its latest verified game against ${game.opponent}.`,
    `${data.player.name} finished with ${game.total} total yards and ${game.td} total touchdowns in the saved game record.`,
    `The next scheduled opponent is ${data.next.opponent} in Week ${data.next.week}.`,
  ];
  const published=(()=>{
    if(!news.publishedAt) return '';
    const date=new Date(news.publishedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  })();

  return <article className="newsroom-article digital-feature">
    <div className="newsroom-article-tools">
      <button className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>{news.kicker || 'GAME RECAP'} • WEEK {news.week || game.week}</span>
    </div>

    <section className="digital-feature-top">
      <header className="digital-feature-head">
        <span className="digital-kicker">{news.kicker || 'GAME RECAP'}</span>
        <h1>{news.headline}</h1>
        <p className="digital-deck">{news.dek}</p>
        <div className="digital-byline">
          <span>By <b>{news.byline || 'DynastyHQ Staff'}</b> · {news.outlet || 'DynastyHQ Sports'}</span>
          {published && <time>{published}</time>}
        </div>
      </header>

      <figure className="digital-hero-figure">
        <div className="digital-hero-photo" style={{backgroundImage:`linear-gradient(90deg,rgba(244,241,233,.12),transparent 18%),linear-gradient(0deg,rgba(0,20,14,.24),transparent 48%),url(${playerPhoto})`}}/>
        <figcaption>
          <span>{news.photoCaption || news.dek}</span>
          <em>Career Photo Library</em>
        </figcaption>
      </figure>
    </section>

    <section className="digital-scorebar">
      <div className="digital-team"><Logo team={data.player.school.slice(0,1)}/><span><b>{data.player.school}</b><strong>{game.us}</strong></span></div>
      <em>FINAL</em>
      <div className="digital-team away"><span><strong>{game.them}</strong><b>{game.opponent}</b></span><Logo team={game.opponent.slice(0,1)}/></div>
      <i/>
      <div className="digital-stat"><strong>{game.pass}</strong><small>PASS YDS</small></div>
      <div className="digital-stat"><strong>{game.rush}</strong><small>RUSH YDS</small></div>
      <div className="digital-stat"><strong>{game.total}</strong><small>TOTAL YARDS</small></div>
      <div className="digital-stat"><strong>{game.td}</strong><small>TOTAL TD</small></div>
    </section>

    <div className="digital-story-layout">
      <main className="digital-story-copy">
        {paragraphs.map((paragraph,index)=><p key={index} className={index===0?'digital-lede':undefined}>{paragraph}</p>)}
        <button className="article-data-link" onClick={()=>go('gamehub')}><BarChart3/>View verified game data<ChevronRight/></button>
      </main>

      <aside className="digital-story-rail">
        <section className="snapshot-card">
          <div className="snapshot-head">GAME SNAPSHOT</div>
          <div className="snapshot-row"><span>Final</span><b>{data.player.school} {game.us}, {game.opponent} {game.them}</b></div>
          <div className="snapshot-row"><span>Passing</span><b>{game.pass} yards, {game.passTD} TD</b></div>
          <div className="snapshot-row"><span>Rushing</span><b>{game.rush} yards, {game.rushTD} TD</b></div>
          <div className="snapshot-row"><span>{lastName}</span><b>{game.total} total yards, {game.td} TD</b></div>
        </section>

        <section className="related-card">
          <span>RELATED COVERAGE</span>
          <button onClick={()=>go('gamehub')}><BarChart3/><b>Inside the Game</b><small>Player stats + scoring drives</small><ChevronRight/></button>
          <button onClick={()=>openPodcast('episode')}><Headphones/><b>The Huddle</b><small>{data.podcast.title} · {data.podcast.duration}</small><ChevronRight/></button>
          <button onClick={()=>go('chronicle')}><Archive/><b>Career File</b><small>Follow the preserved career story</small><ChevronRight/></button>
        </section>
      </aside>
    </div>

    <section className="digital-related-strip">
      <button onClick={()=>go('gamehub')}><BarChart3/><span><small>GAME DATA</small><b>See the verified numbers</b></span><ChevronRight/></button>
      <button onClick={()=>openPodcast('episode')}><Headphones/><span><small>THE HUDDLE</small><b>{data.podcast.title}</b></span><ChevronRight/></button>
      <button onClick={()=>go('chronicle')}><Archive/><span><small>CAREER FILE</small><b>Follow {lastName}’s season story</b></span><ChevronRight/></button>
    </section>
  </article>;
}

export default App;
