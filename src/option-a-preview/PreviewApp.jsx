import React, { useMemo, useState } from 'react';
import {
  Archive, BarChart3, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight,
  ClipboardList, FileText, Headphones, Home, Image as ImageIcon, LockKeyhole, Menu,
  Mic2, MoreHorizontal, Newspaper, Pencil, Play, Search, ShieldCheck, Trophy,
  Upload, UserRound, X, Zap
} from 'lucide-react';
import stadium from '../assets/dynastyhq-football-stadium-bg.webp';
import podcastCover from '../assets/gridiron-grind-cover.webp';
import './preview.css';

const playerPhoto = 'data:image/webp;base64,UklGRnYgAABXRUJQVlA4IGogAABQmgCdASosAcUAPu1iqU8ppSOprHYOWTAdiWInABSVOw3weN5hHLPlEEO6ye89NP923jXOx+cJv4G9LWk9zWxs9XoslzHWb4o4PyTg8WXDKAvFg+yPYSQcfgNHVMBkMCBeM60yiLhm5jhK276da4U3v+yKmwYIBamn3lEYMGpL+goKbjMwEncd1K5GkPUma1JJZKiwO+Y7aQxLe4aFTpi0FP5gCuTyJbxpJdcmNadjjRaCMC+axg2MqYC4Im+VLICwonkUawJDqqgnoGBn3Sj/Fju2LdraHrla4bFMtxg+YWJh9Spo30Zs3BFulAxOTBW+DcWkvVBVs7Ux/8617XknUswt4Xh7FMnyUIajnPQ/fj8zv24RibwuC8rwKmyP/bUmxMykMkEeL1t6tHAjLIP8uE8CZGWAHtq9f2ix2Pus6fxDiCIapHyX38+7YFD9m3cLDrrAHgsb78uCxYT72QxHrkZ9rOy7biu3OnzRe3E5fJM0ddPdvz8wtMneEyHdxWpYRWhz9sW6n40GprOUrSCsuJAx+iLdt6lQgcarmBELGtUILaqmgpDW6yZ6w4hnrYmJyOh6kVEfPOA6Gg/B3CiEK+ofoMRIO5ZLdvnbLxYS0g6XVTq/NAsy7n79nf7W2NVaW3cA94EQ9dhBidHCRGNXmZ88cY4zOBXkYb5L97z6hBGa0aSb5LTmy/a2hUwubqnHKgHLFAaZm0JsmN+VKJNoNTXib9aoBXEmEK9ulRcQTtk/FMgrLwSuKjURC+2cvV5dV/PITMTw3dOC/h9I+qa5BifxD9fXQFOXe0tE5DZVKYsYvoubDuc6YoFFt0/djHClOozqH93lyMeAIKttwNLUa8ShZ14Lx9XrbzMPHdKm2xpdBOvg7Bh7gFPR/kEWSRtUPVpvXApWN/+5gJgE0WDraOG+LGvnTPFFVKdS5G+h+FxWIQAgNUUcxmjzXeFRiDYB/X2m49QoiHct6GagzkgOZ1mPUQUHNu+YkCMfkqCLaXuo2tuQEYxG9BiR5uuJh+5dqGomFEZKXizqRmc3W0mjnt9yxSNssx3JsMdyv15m7hsen0amczPYgKr0lNeMNM50Eojy1x5yf/WfoPP1Y/0uHU6CouiiaefBfp3EMS1i0UZZkenGN5d4qneFWel5SxocgX95yJP7A6wT4iBwSRgvRxBARPZBuxpcZGoQhHK5GOvsloyRX2kvGfzMi4DtNiMQLqmOhq+4VurBWlC+ANzIhIQieD/hvwkw00rvDx5P0Faox0CpOYx7EaHLkAqwOcKwVysm+evApCpSqe1qX2HfNjf5TsqFZ5m1KKVauVJpV97eufbJ0pwA1eghZhclLnkVRULzCKtyd1xoaJpQIndsT+S8v9b256hVvB/HRSo3Yo/UQ8tWannEoJ+zh9DDLR/zrK+8HvNW1Pgzdu3j2WwPr1xvf7jkz1zIDNspSMuJFvEbJxHKtoZPvs/WGZg4lAPSSIP4zKpP+hcQ/6jfpUmtD6eJI7LfEtaE4vWLCjkh+iRKBkWTQBG97MAlLmukNmnz31lo+83NFC7pEI8TPdM/MUsctaOwrvZ0WHO2/Wvi8q7FFF2Mv9vMm2Wub4wJhc0RkKEfluYDOHyn76nxZbieTkXOwwITm23T6GOouWhB/LZh3ORs6nTbN9pAAP71m+eVjfkKkwWMQjY1DsL/E22bKzt4C2iP6PCvk36N2z33HdPcm3ZSyUTyXnRnQRxaPGxKaJMx+flFnPCkbBUzIRMJJS92PFC1jv3OiWA/y/W7B9nnUerJyzaSuBm1wNfro3fm+c6rnz2KcM0wfuyNq+asPhKvClb7Y+vZuNM9dNx8JQBWzU43/3472+uXOPuyQzfMxO8Sky2yxafq6UQA+NA655HdOZKdvKBONNp5SVRsASSvmi9PgOi2G/7iGd1BcAuYHQEJ1qoW4juGRCyRMCdEj/kyBgyljRHZNv02hNoRP5qFPNZmqjYTLQUNXRhNsLvYqw7uSkX+0XzZkISxu1kOPGRdzljkli+3BhlXYsThuq8mI2dqPn/PdufAl7DS2hCUTHL/XOX16IYDFXWluH+zpeWKLomwHzIJpQ9TqF38lO44sSGh6HbpKIbvQThIyfJsEKDIfZ4OuYB28Bz8NCncw8q1joJGJ3t1AwLCTaKlaKGMj2QQr0DGRUpHKWxkumajP5rM2ueuQ6owz8ymC5pbRXJQix4YbBQUlk5ru5soSghfAbxszSUFmy2DCYcc0Tgpzyrvk1X0N5ueqclk+16xgnGThCxu4cl680qC636th0ujntFRMaRQdDBWHNPRUje9E0Rl1i/b2FlsuBsKPe//WjBpfX9Ru1YMz9YoXfasqyhWoMS6fIvpKYvPt3Lw55X+mE9L6bwB+wB4xYj5JfjbcgZoPCZqLhg3Vu5Vor2QBH9hFenJmsHYVpH93voHHdhmrZAE/yzu0BsfOz/kyN3YF5PU0Jx7q4OyPHI9Q1+nsjuAhTrJmBINprLE0fovQfhfqI24cYYa0Vu/6087T6mJG4/DaYYptmJhhbGrm3qRFNdpmKXa0+h3GeDEt3tzi7mur75K+XCk0kiAL5C/j4lA9PkvyOe+7KZEr3giqlZA1a4RqkUFhW9Xp8xLiAPVJFLYPbGGS+3N3Rawa3e3h7j8s3fzvVNc9OdrhN6k1syn3GdPrioLbXsBTISs2kzqni8UWS+bFTw4va74AOtHRuAe5KvhYAiW2PHxCZ83wikCQanr1apWjuP7Qguyow2YwiwIPTw6YBvw9AJpaOFhI+C8d7oBwmeAKVEZD7M5bax8m79Rm4nBP4gQZmDjWbISY1HZaI0qJB0x/E6G+bHg26FN3DHDKdzRxveGkbL7moAn2tqhP9vCPqgyS+QK4NfYsGUZeJ7/hkLxtVOMb5ihJz4FsU1n2gRhYM2M+BM+4h6/Sji6w3pQjYUhOvx7ptWugCjz6O95E3VBDZD4+xjUs9UEgZX4Z7EsZzLXuz5VJPHeZDyFlORc6JD/SMoJOh+dC8hjp8kPBSFA3NulbByyQUW7XINjWrobImVAFUcy2nGe8MGhtSoMIbUcY9lZHTfUqSZOVf++e9IjDelHkiiep2u42V6BZbBUHvYyLQc+PqS7Nk0CVXNQm7BNZe/4fpAWWFjFVXpXlxEDMAwcUcTNtdPfc7NmNI07GGjDQ7yEWjWVVeR/BduCDqzOIm66frNU6bUEEUdyuRQZTuhkDCXCqxfW2pg6BLtJoCNMVLSSwl8TchHmtJcp7y/f9GFTK2Ifdi3rsg7v8E0GDWXCstPzTmAvyjWIMstEUgAf8Xicnj7qwOyypk5fMZVda4+JXVN8ppglIeECCOR7UFg0Lu14afQQxvw15YgNt4Tp1HR5j9kCgU5qczengl+9CEdLZdoya+q49r2wrEpuuB8A0/J+GXqujHCBlmSafitICqnaYPYQZd8sXhlXV7+w5MzkS32iNOaj4S7b8h7vnD3Ei/Hr0KlNEZw9qKRO4aFgxpBb5M6d+VUIohBmzkoHg8HkkItMzJpwHw3rIxKK80DlgDxeUX0EqkH+hXKuzu5xGNYx0ReuDgPJUU8FEB1Ap8oD2ShNpUBShJLTo3aFJW2FpVCRir0ROpB/IMgP3glxX7Y1O8Kop8DUGw5qRAGSJfYp8OlyCs2mEvNqfawUHJB1AUwZAWTFfFuaf/umrWZtVba9DStv9aXgNrnMydstgzIIvuEnMG+oCTaABhgCH82jNwKxcRYxv6aHvCcuByBndC7U1wdOY3aEwd4TOvU6S0l7ACj7X4cmmMqlHEXs7SRKoSJKak4+0k5rH2JGqf+tNjCuP3qZknUl5SzWW85+eS0jCSy0sR7U2x981OFMdZeXlp8pZsBfG0kLUnf4wDdb3RmLwpazM6y1XhG2tqurk91KeDraZgEgB1JFg69z1dVr0XtkUMvIdaRQupeEqOLR0tvKPVW7cMU8RX5OolJV8wldqPW5IdMEfx6UfpQv7rrsKV0CkN5fD+lbF3C742emcnruEU/q6y/0Gdgl7DWMDmpWl6J8NYkTx9KjTHfCkiSsVGpAM0it5EzKpgqZZ20QWvD9bqw6RA/JA7k705sQTb95uH2MQ1oAtvvweJ4GjmGq1ZjBb63lS3p6Ge6fGhEyP9Csjohr8lL3dQMS9jrdQRkEx0MgdY2cPkKtn+baHFVuUT6ka6/SbAwIey+j3SxvyQsPnbxdUVjb2TcfV/Fb+H8oqlRwjfN+y2XrD+Llk2+OPKYAcaZEREPlwkSqt/68So0kp5GILG1N4qcFaakTO+R+ZxpfveW9Yk27tZblzLzv8p8wlSA2XrFU/x2SOU9JOTxLoFQCVfLmEdhit0tpUboBb0ef9lzTYFcC0vIbGX0/1mxTXyuF8Xn9U7i6kLsrXNSRh19GwJINzAcRZLykG/RiVfIXuRXuwbirxRnWBq0wzwncilDxc+ofRsOxJhl2TQRt4Ss8TYmc3n+h9ZNBexXNpLNcBfi8cGWsQ/JCfAQet07C5uvcWnPEkjoa00kBf1mTEjfKbhvRWHGhWsnJ10HkJVGvW+YowPVu/qI4ic3A/lUn42v38S9MXIlvHrOps/csUyRBk1NKdBC5HJi+YzxLOpxLBh8is8EC3D5Jcg2M0svXCDuX153H0L4tpOwXGtOVGFjT8OpkqKzEq4PY6KZ++En/5OCHv2Stflg6LIJR1hhyl8ZJoWEGn3VsQawDIJDgddRyQp+Z312ykfBf7Nzln1lWwSK+PCcrrgUaW3F0LJitDVfvtevcbVQwCsmsf8Nq0C/BuAJDUoi4udKAk7/BGKqMBKeQjJsUXDrHZ3lzyN3o3UyF+mJdCCFDetEDaMdVnUztszqp6KRf5yeuYRvfLxDZvm0mGxXq5nC35Hf8ufKrus5KeO0tz5a11N0+PiT1sN1f8pI//dKH2wfiU7kk2KKEiWNS/WMydo0fRyKi2YR4htcoOvIle67Le3S98oDTG3AizTjXmMdYEa2orCxJ6yuYPi3GOu+yf5c8Mr4JUitvbQIx3SWpfqRyV5Rnc0IbO2NratRcgwdgjaLD8qSBx+txdC7KQ7DKJnVk4zjo9bNL+UoXj4T6+CvTpCmXC+2R+7LD3z4CcSFA5ucbZTYAkcc8dO+egm6rHTscuNN6IKc4b+nzbaufsTIdzIwFgPVuy2j1EE+vOOw0qQK4SYDeKMcqoB3QNgXYNdPNSUVVQmGp04jqmggWcM433CxeodjG1/8CY9OhRl9GBy6L16g6UllEKwYhkPZ0zK1B/jZMmfoDokySsCNhUMORcW1o9tqXymUbtQK/HLRSzlVVFE02ShK17YKFNh3lQzMIx2cQN67vp3YS6ayxz3U8QmejwArpc5ykq5ObZEsgF9EMQraMbQgwDJTOtQXwlEVILvzZj+bhZTKSgaCjs+i9PNMPIdpQ+ISwlJZWodeYnClH0nmTie9MVn5bknhks5k3EYAzUnfHrM/ddcUCtPaxDe2CR6GThYcnOPbpr3cloWfCRNIJ8NpZr5Y4oWF8b44SBWQkGkrgOeHNX+Ysfi34ObER27GxlBhb6vjud+r7xIO+zKE4MXElT6hFOqRzgcJQzx5+ZD+y+aM5EYozII49t4t7Mrdx8eGoHl25O7vQRGuLTD9/JYh7cALRjm3EaXDocx2XEorT5yfxDIdEm3HYaxEX5LWxbSlK3YinjAYX9Dw7ub0TKM18RTHPsVhjVOenXtTegtbtBUVO8auL31tOkQL3sGvPh4JDvhSJUjXlarY7X7pqro1gvjWTkI5Z5+JPpMhDUb4RFdlgdOND54Dl+vhMzFnYpBWYhhi0HdGIpNJ9ZAenz0wyyWd4mGoI45+boSyM7e+ubjCKxp0WL2witEVRx034VW0wHYxTc/ZhvT491WCMY0txJZmtIFGB686gDm3EvMUEZgPHW6LwN4QmHEdi0nob33kDLvunQwsvC4tTatm4QCah9J+rtZb3lKux1DYee/kLc3orRV0UStTuFdPfA9/7pzuIrJPygyQcf7R836v/xllfTqOeJTM/aMmRrDmHNDpC4hIF6wyfZnpeRFOxz9PpZ9HJabocPGaS3k6EB0gxsvqcnQg3GEO73lRAKZK7OlizPbmlqNlw/6Dc0ZQsm1MeSJNvyBpnV9P2Wt7EwbzFf3oGlFoZPELYf5e/eJIij5iSYnuLE2JAB6dyF/6PUltcu2dpTtPfjI0z0Ux0+l8bqUvl1V8HAyLJxDPicsiJzcIBAYbWRXNJcSFUBG2t/r+DVwLDDutL8e3QSJU6Ppgi5ajQtDU3PLKvStIjhekFGoFC4SiRX/Hrei0x48ZTYK/qRbSDiEnKEgx8QQIOMK9lVafC+CEYiqbb+msvf/E7s7jI8AF8nouUztjRkeMIj7cY0NN0rVq8fMLjVcCt8ghSWeVjhc9q3zP4QvWormvz8BxF3spvau2BNcG7vYT7Xwv6JX2eMn3oyHfOLEFsXguVolMcD5/U6Cu2hh0FfwIsLsniHGiHA2bKo9eWXOHj+3YVFQpINH5glyD/kvJW9dNtbNG4lHmFdaaEDz2K7VmtVyI2Kbd1TItgDcQ4FGYb/Ew4sRnkal6Rdz5Pva10aAN9tvogVsVOXe8k4GlS8GD0eSHaY5ND6srVZ4pI9yWr8whzswyZePSH2t4spYnN7yNhbUHOuGf++A+c90nXiSwW/zZF5GSQbd7ybbjp8nycrsSZXqomRudf1eHcseRIm5FnpIt7mGnij9UtacMdD/bj3X8Ru3jNl3aP8jtcJZ/n34ObxJeQ41lVtAbfK1z/w0hlg8l7ITuglHxL+nhUcPJ+QJpG0EIzREeata4dLF8C35sBMO02OYeAz6m2+m4d9J2woWnWPNe2oY3kiUINaGtwcV9vFn/qEPIuoTKG5XKQoB5QZtPRrDtJ0GcpV2PkJL/9TIpmFODPmO45f4uhMIgisnQ2SYIMEcXcO/+w3p1tDfrWnOLTf/ZNiiMprALncFD0VVZpw8avhC7oJnz2ODK/Zpqx2Rueq9jkLZBJPun9wpDCK42n5Nr9o830WYV74ETXQVF+9wSNZ8WodYN4qMFgJN8R2kwlD59f9/+Pgjh+cwLLY+987oJpN0JLQM7jwkQptDA7GEaj+jkHnNrMCWHcUIlKVMoTPRif8YGZ2Lu/+Kx3aryVqNkTZKvTCpXjeGHBoc8s3l8eEA6iBg1U/p1MdtUUTdWkxhaVONMeOLcYPC6bQjD4UNV2sasdyik+TiDEsiROrgkHm73dUM22K+JRIZ3GmdaGhCqghAhzBDJAw8oX72SSCreiDYhX8VMo19LRg9GT4ZB+q4yrXfaL7YSpof7ylSz09jWRgr8KHKmWQ6cekYIM/NQR6B4sNhipEdcFVt/dUrb8Zee56c1clggA+HHK/2jumVhr+aVv3F6G1XN8UQAzNwTTF6hY2koDxmX/TJePwqEKsZFgVJjQwHS75LUqPQSFe+Q9GtqmRY2ZDxsgh78u958xN/3p/T1M2R3CZbKlR86gl541ue0kBu+b477FxvqKsRmlyw1G6x4Oqk5YtJG1cyKyLuvtrmQzf1xcAQF6dG+BafADg1MDrvyBLcMFXObUDWnjriZ8EohYWEeaO7gHCPbg/kk/syoYRfk9HVg9MYseNS/7v5bIektkqi9/oI/g41eA8dWU2FpFtnkEvRHxPmUpto0/qJjv61e+8TbXTR5pdQCooRFASqS55kcZRIBnCpjekKLY9OkOF5PNDAPsEosLsRM6Jc+AVhO+89AnP63e6tr/TBAFTGelQBM5OFCRWBKvp0yiSxmmAE+G0Sh0GHHH2Vk07CS+cThRPyQveYCxQYtwPGo4euz0fCuMVKO6sI21MOG/Nk6ft+AH3NTZlxCLnFUaPj6UOzd7+4s8gpmJ601MOmf+nLKG2sqqwE1VJUYGVmUyv3f7+IRG9hn/IPIyXxsFfFKIwv/+MvH6m6dIejNBZv5RW5rc1HLvoN7XK1MYSZlcWOOViP6JgSXcdyDMYGfk5c9FqQstsicNQKcF5YqBpZ3sDGCd+OuaUH9tP5H4PNOpg5i0SRAd7tBynVmyCeoyNZxmOSLY4ftx4+wmm6w09swE7gZQOy0HI3OsJ+p0kdQtCIf1ZPvXirzGvSipSvqll1wFoOKCrbWXNFZfECdJcDbFTaAJ4BbRYKjr0/mkdFRqXANifoqW4DP7tkFo0sAbERh41n9LCo7ULjxdfjkiwOBv9oh6YFWoiRpgcDJO2gscktBY4ygYcq2aaqJ42dwuLSbJQih+wIPt3W+OAf9ZNOFZud96X6CggwjABhoIoxKI6UWnYvmcCNvUpnaX3j4N/jooILOM5Yta+/HWGxL+oq13IvJbJRkUAgdaLAfEu+VYB1SKybQxd411V/52s5BfV3O7EfzjGT5R4i7Cg6xWWLGj8/uPq0gmzC4n35kBfyQJtR7etwWWIHthKgolvrQvxtS/cq70sIfaQ4P9xfWSK36I4nR4Ap45q0VqbENzF+1YaKdjMEZwx8znxuNTeRJCBjtPXygNiJtGPFiCwADtDLqrGhczUhGGplalNwCd/hJ720CJ74XOKA/eCkifgFNmH51KniZJF478GYEqrhRraHmoew5F3ffAjVO7aniVY1jghWcCVyqAi2JqmF6Zgw1VNwzwGRBh/7KDKzkD54TJ6fF7HJ3OHBRdWAmXtkMnlaef88klzDaRB6Y2NKkkeB/Fam17lXuVMCKEgTye6TXUSKjV4xvqXtLhYF2J4TAlzeMx9koxi+ALs6Dpzn6Ty446cbKG0JwU1VIs+hMtrJax4dD1U53oGrIW7FcSeQEg8EwrgqjP5FCNsebdhsmacTgOenLSkdrhl1dddlkrKpYK7+MoyUaCU5P5dYI5wVstI2d0gUlBmJsUl/Oh3+Jj7M6ZZSUVj0QyoLdtcc1EWoQ4jUVSIA8sGXG5rPP9NhVZEIHxA35uGUZGKV1roDZ+13MK1t8t+bhOe0vRRW66Du9s5I9fFRGM9KIYlYUPOZYxPmzaTkG0SFkMWGpEPFbnIRzMIYI0AtWtQ89PCj3zz6OSriU+PLeFXioYxHLVXpBO4uYXtSDmZdGGv/R+/2NoNZF6X9FR5Oji0M9+BO0sxfMLitvDZ/kxRWLfUjsBb9AC+MOwswkT6f8ESJ08H6jzGmD099EOXWpJlHbT2gcyoOoUbTxqC4M22gWCBJUhpP2BLw6Cw6B14z08qWzjh7NNKEYXxqkAkBcdk/q/E839mi+hqfsgBHw+7JfVJ9s8yrMVsv4jCYi/ToXhTbEHCgM+fB0ZA+TroraqOW0r2Q8rJXEY2psxWZXgm/eV0ga07tZWleIlZKXjhouGizvOo4rAJSYpV1xVU+pdS5yesg/6WbnxhcKL1LoZ99MRgGt6djw++UlIzBeHkBi1hR5rmqyV1+XO81vWqxTBVcT83cmZGZghHi1uAXeidYC/XI2XDznBoflV9cLeb84zejMD5js5ng948WalbiJ0Z+JG2r73yL2MHL4EsSv5C+FqNSkiPhx8M6nCFaAZ6/rUwS4imPJSKLVbJes0z4eNXm0hZNGc2EKezjwP/UKY2tKUEsVHcuxGG2m6INo5WtZ67KIOnjqkm/8QNae8MPv1ozXf44wDA/J+e0Hrxk1GF2omtT15yV54WpO/Ye/vWwp10yq3A/Z9giphFgDHGllC4LiUnMILbqSTPpZUoel35cHLDyBK6eOFesP/AubHFCD35V6SB9Inrcu+yrbLVQDThd0KwAR3D7fs0glLlmw/+ghZGi3YLg1ZUigLua1BExYyjYhiyJS5yKGJtygEdaqOdSbtEjug5KuLCy2xLLX5MGKAqwncwfhipxBVwIZI3yHgkAmOaTDe7GdtU/s/EIeGuZe1gMOrfQBbYJAiV7vTnP3QD00KboHiwYK6s/9yU20pr2tc20nH706jjf/mX20jyJHT63S2nw/gN0xNJVZ2IA1q5fuqqe8bWsgE4vLMzeZyPsES6IT/KPjmJlXMBcGwyBxqr8EbzxYPYiUBn9hSwC+fOaSbx4ZFlyLcus74kakoRhOO73AvZv3g9UKGsFDrwoWsMaOg/LmiBzJfZemBHgX0lGbqYBPrDY5ZLh18JGp4U4iLyLghHpX0/1bZ8kD4uhByGhNdRljl8c/JVyslSKI72wr9kgofl8YQZ9NoL+dNiOfZueoM7t8xPVM7pi+f/68na/jdLg6Tnnw5BJc3sHvx/rFVKlP/rSuPO7DM0ziaIND9Ua0PNovuujWfjE6sBUID8W5Wx8/GOhry5Ku3qNioAXJ4/+FsxAvAZhEUKpdCFmgLKoxiUdZ8Ip6S38Yeu/2UJTub+saEoQn+km7koMVEHzpsCT4ANgUow55sUPc5Cp7ehu2HOI48qWp+fG/Ams34nFeVIbZtuU7QdtcdU/yB906xwX+wAA6qQi4Lo0U13EWG7SGnCDKnF6hDnkTwpFD3UrvNGP5XKLcd1MbWxkytUkcbWJVIJKwzy5IP7OH9PM5vNPTy7DbBdQuvLrxlxG2Woh9OChwIvARmLvWBzLjSdFKmqSyaprL2YXiQB0K9T0x9if8O2iTwErrO0+dlBxswkzYvjijbqD3TGPGGJRIgsZjHMKtYyjPhPDkFKQl5ghOTNsd78PLvVS/shYMqk74Gtms+cushRB+swO4zBea+0oubo4DIDWzl0FJ5sIkh8/nuvzpfhzKT6mhkgvQv5Lcp3vSuhl6nKt5LG7Gk0+SWRe9suVMmcpcPyfzMilxVZZHrd+Rc/ODICHIn7w6j8XHVJgcvvNKriNnGA4C1dQzdS6QQSOnmIbBtEnbhGbE2A3OnQDEjxIxFeE4SfP2POxwIxCBSP5/SFxuKoInI2ruguKkpO/GQ0b3ZgAdfGY2c9744HMz4HToV2xxsnM3+UB4g1tAV2Iwa04fNG31IRA1TQF33s4SJIoPhWMEXnmnQAvMIZTMEkfE56rxG21vcWWGVqrYWWzJSRWMxa/v4mlZEtrN2xghjiM0AjpM0HI49y44dmRWzfpnTzpHR/UXJp36PXC5yj/iwTizK+hnJj3UK4qcmVqtnwiApw6lXBf7tkQNFQGkNMjze6ESEAAA=';

const pages = [
  ['home','Home',Home],
  ['gamehub','Game Hub',CalendarDays],
  ['newsroom','Newsroom',Newspaper],
];

const sample = {
  player: { name:'BRYAN WESSEL', number:6, pos:'QB', school:'OREGON' },
  season: 4,
  week: 10,
  score: { us:54, them:48, opponent:'ILLINOIS' },
  next: { week:11, opponent:'MARYLAND' },
  stats: { pass:286, rush:124, total:410, td:7 },
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

  const pageTitle = useMemo(()=>pages.find(p=>p[0]===page)?.[1] || 'Home',[page]);
  const go = (next) => { setPage(next); if(next!=='newsroom') setArticleOpen(false); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const openNewsArticle = () => { setPage('newsroom'); setArticleOpen(true); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}); };
  const notify = (message) => { setToast(message); window.setTimeout(()=>setToast(''),2200); };

  return <div className="site-shell">
    <header className="site-header">
      <div className="top-row">
        <button className="brand" onClick={()=>go('home')}>DYNASTY<span>HQ</span></button>

        <nav className="desktop-nav" aria-label="Primary">
          {pages.map(([id,label])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>{label}</button>)}
          <button onClick={()=>notify('Offseason is intentionally disabled in this visual preview.')}>Offseason</button>
          <button onClick={()=>notify('Career is intentionally disabled in this visual preview.')}>Career</button>
          <button onClick={()=>notify('Chronicle is intentionally disabled in this visual preview.')}>Chronicle</button>
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
        <div className="career-copy"><b>ROAD TO GLORY</b><i/>BRYAN WESSEL #6<i/>OREGON</div>
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

      <ScoreRibbon/>
    </header>

    <main>
      {page==='home' && <HomePage go={go} openArticle={openNewsArticle} notify={notify}/>}
      {page==='gamehub' && <GameHub go={go} statsTab={statsTab} setStatsTab={setStatsTab} notify={notify}/>}
      {page==='newsroom' && <Newsroom articleOpen={articleOpen} setArticleOpen={setArticleOpen} openArticle={openNewsArticle} go={go} playing={playing} setPlaying={setPlaying}/>}
    </main>

    <nav className="mobile-bottom">
      <button className={page==='home'?'active':''} onClick={()=>go('home')}><Home/><span>Home</span></button>
      <button className={page==='gamehub'?'active':''} onClick={()=>go('gamehub')}><CalendarDays/><span>Week</span></button>
      <button className={page==='newsroom'?'active':''} onClick={()=>go('newsroom')}><Play/><span>Media</span></button>
      <button onClick={()=>notify('Career preview coming after the three approved screens.')}><BarChart3/><span>Career</span></button>
      <button onClick={()=>setMobileMenu(v=>!v)}><MoreHorizontal/><span>More</span></button>
    </nav>

    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function ScoreRibbon(){
  return <div className="score-ribbon">
    <div><span>W10</span><b>FINAL</b></div>
    <div className="score-team"><Logo/><span>OREGON</span><strong>54</strong></div>
    <span className="dash">–</span>
    <div className="score-team away"><strong>48</strong><Logo team="I" type="illinois"/><span>ILLINOIS</span></div>
    <div className="score-sep"/>
    <div className="upnext"><b>UP NEXT</b><span>W11</span><Logo team="M" type="maryland"/><strong>MARYLAND</strong></div>
  </div>;
}

function HomePage({go,openArticle,notify}){
  return <div className="page home-page">
    <section className="hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div className="hero-overlay"/>
      <div className="hero-copy">
        <span className="eyebrow">WEEK 10 <i/> FINAL</span>
        <h1><span>A NIGHT TO</span><em>REMEMBER</em></h1>
        <div className="hero-score">
          <div className="hero-score-team home-team"><Logo/><strong>54</strong><small>OREGON</small></div>
          <span className="hero-final">FINAL</span>
          <div className="hero-score-team away-team"><strong>48</strong><Logo team="I" type="illinois"/><small>ILLINOIS</small></div>
        </div>
        <div className="hero-stats">
          <div><strong>286</strong><span>PASS YDS</span></div>
          <div><strong>124</strong><span>RUSH YDS</span></div>
          <div><strong>7</strong><span>TOTAL TD</span></div>
        </div>
        <div className="hero-actions">
          <button className="yellow" onClick={openArticle}><CalendarDays/>Open game recap<ChevronRight/></button>
          <button className="outline" onClick={()=>go('gamehub')}><BarChart3/>View verified stats</button>
        </div>
      </div>
      <div className="player-standin" aria-hidden="true">
        <div className="helmet"><Logo/></div>
        <div className="jersey">6</div>
        <div className="arm left"/>
        <div className="arm right"/>
      </div>
    </section>

    <section className="home-cards">
      <article className="dark-card next-week reference-next-week">
        <CardHeader title="YOUR NEXT WEEK"/>
        <div className="next-body">
          <Logo team="M" type="maryland big"/>
          <div><small>WEEK 11</small><h3>MARYLAND</h3></div>
        </div>
        <p>Keep building. Prepare for your next opponent in your career journey.</p>
        <button className="yellow" onClick={()=>notify('Next-week preparation is sample-only in this preview.')}><CalendarDays/>Prepare next week<ChevronRight/></button>
      </article>

      <article className="dark-card wrap-card reference-wrap">
        <CardHeader title="WEEK 10 WRAP-UP"/>
        <CheckRow title="Game stats reviewed" sub="Player and team performance updated"/>
        <CheckRow title="Coverage ready" sub="Article, media, and highlights available"/>
        <CheckRow title="Career updated" sub="Progress, milestones, and records tracked"/>
        <button className="outline full" onClick={()=>go('gamehub')}><BarChart3/>Open Game Hub<ChevronRight/></button>
      </article>

      <article className="paper-card newsroom-card reference-newsroom-card">
        <CardHeader title="FROM THE NEWSROOM" light/>
        <div className="news-flex">
          <div><h3>Wessel leads Oregon past Illinois</h3><p>Oregon secures a 54–48 victory behind 286 passing yards, 124 rush yards and 7 total TD from Bryan Wessel.</p></div>
          <div className="thumb photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/>
        </div>
        <button className="pod-mini" onClick={()=>go('newsroom')}>
          <img src={podcastCover} alt="The Huddle"/>
          <span className="pod-copy"><b>THE HUDDLE</b><small>Illinois recap</small><em>28:14</em></span>
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

function GameHub({go,statsTab,setStatsTab,notify}){
  const statContent = statsTab==='player'
    ? [['286','PASSING YARDS'],['124','RUSHING YARDS'],['410','TOTAL YARDS'],['7','TOTAL TD']]
    : statsTab==='team'
      ? [['54','POINTS'],['468','TOTAL YARDS'],['7','TOUCHDOWNS'],['0','TURNOVERS']]
      : [['7','SCORING DRIVES'],['4','PASS TD'],['3','RUSH TD'],['48','OPP PTS']];
  return <div className="page gamehub-page">
    <section className="hub-hero" style={{'--stadium':`url(${stadium})`,'--player':`url(${playerPhoto})`}}>
      <div><h1>GAME <em>HUB</em></h1><p>WEEK 10 / ILLINOIS / POSTGAME</p></div>
      <button className="yellow import" onClick={()=>notify('Screenshot import is disabled in this mockup preview.')}><Upload/>IMPORT SCREENSHOTS</button>
    </section>

    <section className="complete-strip">
      <div><h2>WEEK 10 COMPLETE</h2><p>All items belong to Season 4 • Week 10</p></div>
      <div className="flow">{['Import','Review','Coverage','Archive'].map(x=><React.Fragment key={x}><span className="flow-step"><i><Check/></i>{x}</span>{x!=='Archive'&&<b/>}</React.Fragment>)}</div>
    </section>

    <section className="hub-grid">
      <div className="left-stack">
        <article className="paper-panel verified reference-verified">
          <div className="panel-head"><h2>VERIFIED GAME DATA</h2>
            <div className="tabs">
              <button className={statsTab==='team'?'active':''} onClick={()=>setStatsTab('team')}>Team stats</button>
              <button className={statsTab==='player'?'active':''} onClick={()=>setStatsTab('player')}>Player stats</button>
              <button className={statsTab==='drives'?'active':''} onClick={()=>setStatsTab('drives')}>Scoring drives</button>
            </div>
          </div>

          <div className="player-summary">
            <div className="player-photo"><div className="fake-player photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,24,18,.10),rgba(0,24,18,.05)),url(${playerPhoto})`}}/></div>
            <div className="player-copy"><div className="player-name"><Logo/><div><h3>BRYAN WESSEL</h3><p>#6 &nbsp; | &nbsp; QB &nbsp; | &nbsp; OREGON</p></div></div>
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
            <Material icon={FileText} title="Box score" sub="Game statistics and team totals attached."/>
            <Material icon={ClipboardList} title="Scoring summary" sub="All scoring drives attached to this game."/>
            <Material icon={UserRound} title="Player ratings" sub="Individual player ratings attached."/>
          </div>
        </article>
      </div>

      <div className="right-stack">
        <article className="paper-panel coverage reference-coverage">
          <h2>WEEKLY COVERAGE</h2>
          <CoverageRow icon={Newspaper} title="Newsroom edition" sub="Game recap and analysis." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={Mic2} title="Podcast transcript" sub="Full episode transcript." onClick={()=>go('newsroom')}/>
          <CoverageRow icon={BookOpen} title="NotebookLM pack" sub="Game files and key moments." onClick={()=>notify('NotebookLM pack is a sample interaction in this preview.')}/>
          <button className="yellow full" onClick={()=>go('newsroom')}><Zap/>OPEN COVERAGE<ChevronRight/></button>
        </article>

        <article className="paper-panel development reference-development">
          <h2>PLAYER DEVELOPMENT</h2>
          <SimpleRow icon={BarChart3} title="Attribute changes" sub="See how this week impacted your player."/>
          <SimpleRow icon={UserRound} title="Coach trust" sub="Build your role and earn opportunities."/>
          <SimpleRow icon={ClipboardList} title="Training notes" sub="Focus areas for next week."/>
          <button className="ghost full" onClick={()=>notify('Player development details are sample-only.')}><BarChart3/>REVIEW CHANGES<ChevronRight/></button>
        </article>
      </div>
    </section>

    <section className="hub-bottom">
      <div><b>UP NEXT</b><span>• WEEK 11</span><Logo team="M" type="maryland"/><strong>MARYLAND</strong></div>
      <button className="yellow" onClick={()=>notify('Week 11 preparation is sample-only.')}><CalendarDays/>PREPARE NEXT WEEK<ChevronRight/></button>
      <div className="future"><Archive/><span><b>DYNASTY WORKSPACE</b><small>Recruiting · Depth chart · Staff</small></span><em>COMING SOON</em></div>
    </section>
  </div>;
}

function Material({icon:Icon,title,sub}){ return <button className="material-card"><Icon/><div><b>{title}</b><small>{sub}</small></div><span><Check/></span><ChevronRight/></button>; }
function CoverageRow({icon:Icon,title,sub,onClick}){ return <button className="coverage-row" onClick={onClick}><Icon/><span><b>{title}</b><small>{sub}</small></span><em>READY</em><ChevronRight/></button>; }
function SimpleRow({icon:Icon,title,sub}){ return <button className="coverage-row simple"><Icon/><span><b>{title}</b><small>{sub}</small></span><ChevronRight/></button>; }

function Newsroom({articleOpen,setArticleOpen,openArticle,go,playing,setPlaying}){
  return <div className="page newsroom-page">
    <section className="journal">
      <header className="masthead">
        <div className="mast-row"><h1>THE FOOTBALL JOURNAL</h1><span>OREGON EDITION • SEASON 4 • WEEK 10</span></div>
        <div className="journal-tabs">
          <button className={!articleOpen?'active':''} onClick={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}}>Front Page</button>
          <button>Local Beat</button><button>National</button><button>Archive</button>
        </div>
      </header>

      {articleOpen ? (
        <NewsroomArticle onBack={()=>{setArticleOpen(false);window.scrollTo({top:0,behavior:'smooth'})}} go={go}/>
      ) : (
        <>
          <section className="lead-story">
            <div className="lead-copy">
              <span>GAME RECAP</span>
              <h2>WESSEL WINS<br/>THE SHOOTOUT.</h2>
              <p>Oregon survives Illinois, 54–48.<br/>Revisit the game, the numbers, and<br/>the moments behind the result.</p>
              <button className="yellow" onClick={openArticle}>Read full story<ChevronRight/></button>
            </div>
            <div className="lead-image" style={{backgroundImage:`linear-gradient(90deg,rgba(242,239,230,.22),transparent 28%),linear-gradient(0deg,rgba(0,40,28,.06),transparent),url(${playerPhoto})`}}>
              <div className="journal-player"><span>6</span></div>
            </div>
          </section>

          <section className="journal-score">
            <div><Logo/><b>OREGON</b><strong>54</strong></div><span>FINAL</span><div><strong>48</strong><Logo team="I" type="illinois"/><b>ILLINOIS</b></div><i/>
            <div><b>WESSEL</b></div><div><strong>410</strong><small>TOTAL YARDS</small></div><div><strong>7</strong><small>TOTAL TD</small></div>
          </section>

          <section className="journal-lower">
            <article className="journal-box inside reference-journal-box">
              <CardHeader title="INSIDE THE GAME" light/>
              <p>The numbers behind the win.</p>
              <div className="inside-grid"><div className="tiny-photo photo-tile" style={{backgroundImage:`url(${playerPhoto})`}}/><div><button onClick={()=>go('gamehub')}><ClipboardList/>Player stats<ChevronRight/></button><button onClick={()=>go('gamehub')}><BarChart3/>Scoring drives<ChevronRight/></button></div></div>
            </article>

            <article className="journal-box huddle reference-journal-box">
              <CardHeader title="THE HUDDLE" light/>
              <div className="huddle-grid">
                <button className="cover-play" onClick={()=>setPlaying(v=>!v)}><img src={podcastCover} alt="The Huddle"/><span><Play/></span></button>
                <div><small>Week 10</small><h3>The Illinois Shootout</h3><p>Game breakdown, key plays, and what’s next for Wessel and the Ducks.</p><b>28:14</b></div>
              </div>
              <div className="huddle-actions"><button><FileText/>Print transcript</button><button><Zap/>NotebookLM pack</button></div>
              {playing && <div className="now-playing">▶ Playing preview audio…</div>}
            </article>

            <article className="journal-box career-file reference-journal-box">
              <CardHeader title="THE CAREER FILE" light/>
              <div className="career-grid"><div className="back-photo photo-tile" style={{backgroundImage:`linear-gradient(0deg,rgba(0,28,20,.25),transparent 60%),url(${playerPhoto})`}}><span>WESSEL</span><b>6</b></div><div><h3>From first start<br/>to the spotlight.</h3><p>Revisit the early chapters of Bryan Wessel’s journey and how he became the face of this program.</p><button onClick={()=>go('gamehub')}>Explore Chronicle<ChevronRight/></button></div></div>
            </article>
          </section>
        </>
      )}
    </section>
  </div>;
}

function NewsroomArticle({onBack,go}){
  return <article className="newsroom-article">
    <div className="newsroom-article-tools">
      <button className="article-back" onClick={onBack}><ChevronRight className="back-chevron"/>Back to Front Page</button>
      <span>GAME RECAP • WEEK 10</span>
    </div>

    <div className="newsroom-article-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(244,240,230,.98) 0%,rgba(244,240,230,.80) 31%,rgba(244,240,230,.08) 62%,transparent 100%),linear-gradient(0deg,rgba(0,28,20,.12),transparent 45%),url(${playerPhoto})`}}>
      <div className="article-headline">
        <small>THE FOOTBALL JOURNAL</small>
        <span>GAME RECAP</span>
        <h1>WESSEL WINS<br/>THE SHOOTOUT.</h1>
        <p>Oregon survives Illinois, 54–48, as Bryan Wessel accounts for 410 total yards and seven touchdowns.</p>
      </div>
    </div>

    <div className="article-scoreline">
      <div><Logo/><span><b>OREGON</b><strong>54</strong></span></div>
      <em>FINAL</em>
      <div><span><strong>48</strong><b>ILLINOIS</b></span><Logo team="I" type="illinois"/></div>
      <i/>
      <div className="article-stat"><strong>410</strong><small>TOTAL YARDS</small></div>
      <div className="article-stat"><strong>7</strong><small>TOTAL TD</small></div>
    </div>

    <div className="article-content-grid">
      <div className="article-copy">
        <p className="article-lede">A back-and-forth night turned into one of the defining games of the season, with Wessel driving Oregon’s offense through the air and on the ground.</p>
        <p>This is sample editorial copy for the interactive preview, but the layout is now designed to behave like a real internal Newsroom article rather than a modal. The finished version could populate this section from the verified weekly game packet.</p>
        <h2>The game changed fast.</h2>
        <p>Oregon’s offense kept answering every Illinois push. The article body can carry the full game narrative, scoring context, player performance, and career implications while the Newsroom navigation remains visible above it.</p>
        <h2>Wessel’s night by the numbers</h2>
        <p>286 passing yards, 124 rushing yards, 410 total yards and seven total touchdowns headline the week. Supporting game data can stay one click away without interrupting the reading experience.</p>
        <button className="article-data-link" onClick={()=>go('gamehub')}><BarChart3/>View verified game data<ChevronRight/></button>
      </div>

      <aside className="article-sidebar">
        <div><span>BY THE NUMBERS</span><strong>286</strong><small>PASS YDS</small><strong>124</strong><small>RUSH YDS</small><strong>7</strong><small>TOTAL TD</small></div>
        <div><span>RELATED</span><b>The Illinois Shootout</b><small>The Huddle • 28:14</small></div>
      </aside>
    </div>
  </article>;
}

export default App;
